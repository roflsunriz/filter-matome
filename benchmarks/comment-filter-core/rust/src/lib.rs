use regex::{Regex, RegexBuilder};
use std::cell::RefCell;
use std::mem;
use std::slice;

#[derive(Default)]
struct RegexCore {
    rules: Vec<Regex>,
    bodies: Vec<String>,
}

thread_local! {
    static CORE: RefCell<RegexCore> = RefCell::new(RegexCore::default());
}

#[no_mangle]
pub extern "C" fn alloc(length: usize) -> *mut u8 {
    let boxed = vec![0_u8; length].into_boxed_slice();
    Box::into_raw(boxed) as *mut u8
}

#[no_mangle]
/// # Safety
///
/// `pointer`と`length`は、このモジュールの`alloc`が返した未解放の領域と
/// 完全に一致していなければならない。
pub unsafe extern "C" fn dealloc(pointer: *mut u8, length: usize) {
    if pointer.is_null() || length == 0 {
        return;
    }

    let slice = std::ptr::slice_from_raw_parts_mut(pointer, length);
    drop(Box::from_raw(slice));
}

#[no_mangle]
pub extern "C" fn alloc_results(length: usize) -> *mut i32 {
    let boxed = vec![-1_i32; length].into_boxed_slice();
    Box::into_raw(boxed) as *mut i32
}

#[no_mangle]
/// # Safety
///
/// `pointer`と`length`は、このモジュールの`alloc_results`が返した未解放の
/// 領域と完全に一致していなければならない。
pub unsafe extern "C" fn dealloc_results(pointer: *mut i32, length: usize) {
    if pointer.is_null() || length == 0 {
        return;
    }

    let slice = std::ptr::slice_from_raw_parts_mut(pointer, length);
    drop(Box::from_raw(slice));
}

#[no_mangle]
/// # Safety
///
/// `pointer`は`length`バイト以上読み取り可能なWASM線形メモリを指し、呼び出し中に
/// その領域が変更または解放されてはならない。
pub unsafe extern "C" fn compile_rules(pointer: *const u8, length: usize) -> i32 {
    let Some(patterns) = decode_string_list(pointer, length) else {
        return -1;
    };

    let mut compiled = Vec::with_capacity(patterns.len());
    for pattern in patterns {
        let Ok(regex) = RegexBuilder::new(&pattern).case_insensitive(true).build() else {
            return -2;
        };
        compiled.push(regex);
    }

    CORE.with(|core| core.borrow_mut().rules = compiled);
    0
}

#[no_mangle]
/// # Safety
///
/// `pointer`は`length`バイト以上読み取り可能なWASM線形メモリを指し、呼び出し中に
/// その領域が変更または解放されてはならない。
pub unsafe extern "C" fn load_bodies(pointer: *const u8, length: usize) -> i32 {
    let Some(bodies) = decode_string_list(pointer, length) else {
        return -1;
    };
    let count = bodies.len() as i32;
    CORE.with(|core| core.borrow_mut().bodies = bodies);
    count
}

#[no_mangle]
/// # Safety
///
/// `output`は`output_length`個以上の`i32`を書き込み可能な、正しくアラインされた
/// WASM線形メモリを指さなければならない。
pub unsafe extern "C" fn match_loaded(output: *mut i32, output_length: usize) -> i32 {
    CORE.with(|core| {
        let core = core.borrow();
        if output_length < core.bodies.len() || output.is_null() {
            return -1;
        }

        let results = slice::from_raw_parts_mut(output, core.bodies.len());
        match_bodies(&core.rules, &core.bodies, results);
        core.bodies.len() as i32
    })
}

#[no_mangle]
/// # Safety
///
/// `pointer`は`length`バイト以上読み取り可能で、`output`は`output_length`個以上の
/// `i32`を書き込み可能な、正しくアラインされたWASM線形メモリを指さなければならない。
pub unsafe extern "C" fn match_batch(
    pointer: *const u8,
    length: usize,
    output: *mut i32,
    output_length: usize,
) -> i32 {
    let Some(bodies) = decode_string_list(pointer, length) else {
        return -1;
    };
    if output_length < bodies.len() || output.is_null() {
        return -2;
    }

    let results = slice::from_raw_parts_mut(output, bodies.len());
    CORE.with(|core| match_bodies(&core.borrow().rules, &bodies, results));
    bodies.len() as i32
}

fn match_bodies(rules: &[Regex], bodies: &[String], results: &mut [i32]) {
    for (result, body) in results.iter_mut().zip(bodies) {
        *result = rules
            .iter()
            .position(|rule| rule.is_match(body))
            .map_or(-1, |index| index as i32);
    }
}

unsafe fn decode_string_list(pointer: *const u8, length: usize) -> Option<Vec<String>> {
    if pointer.is_null() || length < mem::size_of::<u32>() {
        return None;
    }

    let bytes = slice::from_raw_parts(pointer, length);
    let mut cursor = 0_usize;
    let count = read_u32(bytes, &mut cursor)? as usize;
    let mut values = Vec::with_capacity(count);

    for _ in 0..count {
        let byte_length = read_u32(bytes, &mut cursor)? as usize;
        let end = cursor.checked_add(byte_length)?;
        let encoded = bytes.get(cursor..end)?;
        let value = std::str::from_utf8(encoded).ok()?.to_owned();
        values.push(value);
        cursor = end;
    }

    if cursor != bytes.len() {
        return None;
    }
    Some(values)
}

fn read_u32(bytes: &[u8], cursor: &mut usize) -> Option<u32> {
    let end = cursor.checked_add(4)?;
    let raw: [u8; 4] = bytes.get(*cursor..end)?.try_into().ok()?;
    *cursor = end;
    Some(u32::from_le_bytes(raw))
}
