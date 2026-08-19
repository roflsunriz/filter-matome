package jp.roflsunriz.filtermatome.toolbox;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** 外部依存なしでGitHub APIのJSONを読むための小さなJSONパーサー。 */
public final class Json {
    private final String text;
    private int index;

    private Json(String text) {
        this.text = text;
    }

    public static Object parse(String text) {
        Json parser = new Json(text);
        Object value = parser.value();
        parser.whitespace();
        if (parser.index != text.length()) {
            throw new IllegalArgumentException("JSONの末尾に余分な文字があります。");
        }
        return value;
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> object(Object value) {
        if (value instanceof Map<?, ?> map) {
            return (Map<String, Object>) map;
        }
        return Map.of();
    }

    @SuppressWarnings("unchecked")
    public static List<Object> array(Object value) {
        if (value instanceof List<?> list) {
            return (List<Object>) list;
        }
        return List.of();
    }

    public static String string(Object value, String fallback) {
        return value instanceof String string ? string : fallback;
    }

    public static boolean bool(Object value, boolean fallback) {
        return value instanceof Boolean booleanValue ? booleanValue : fallback;
    }

    public static String numberText(Object value, String fallback) {
        return value instanceof Number number ? number.toString() : fallback;
    }

    private Object value() {
        whitespace();
        if (index >= text.length()) {
            throw error("値がありません");
        }
        return switch (text.charAt(index)) {
            case '{' -> objectValue();
            case '[' -> arrayValue();
            case '"' -> stringValue();
            case 't' -> literal("true", Boolean.TRUE);
            case 'f' -> literal("false", Boolean.FALSE);
            case 'n' -> literal("null", null);
            default -> numberValue();
        };
    }

    private Map<String, Object> objectValue() {
        expect('{');
        Map<String, Object> result = new LinkedHashMap<>();
        whitespace();
        if (peek('}')) {
            index++;
            return result;
        }
        while (true) {
            whitespace();
            if (!peek('"')) {
                throw error("オブジェクトのキーが文字列ではありません");
            }
            String key = stringValue();
            whitespace();
            expect(':');
            result.put(key, value());
            whitespace();
            if (peek('}')) {
                index++;
                return result;
            }
            expect(',');
        }
    }

    private List<Object> arrayValue() {
        expect('[');
        List<Object> result = new ArrayList<>();
        whitespace();
        if (peek(']')) {
            index++;
            return result;
        }
        while (true) {
            result.add(value());
            whitespace();
            if (peek(']')) {
                index++;
                return result;
            }
            expect(',');
        }
    }

    private String stringValue() {
        expect('"');
        StringBuilder result = new StringBuilder();
        while (index < text.length()) {
            char current = text.charAt(index++);
            if (current == '"') {
                return result.toString();
            }
            if (current != '\\') {
                result.append(current);
                continue;
            }
            if (index >= text.length()) {
                throw error("文字列のエスケープが途中で終わっています");
            }
            char escaped = text.charAt(index++);
            switch (escaped) {
                case '"' -> result.append('"');
                case '\\' -> result.append('\\');
                case '/' -> result.append('/');
                case 'b' -> result.append('\b');
                case 'f' -> result.append('\f');
                case 'n' -> result.append('\n');
                case 'r' -> result.append('\r');
                case 't' -> result.append('\t');
                case 'u' -> {
                    if (index + 4 > text.length()) {
                        throw error("Unicodeエスケープが短すぎます");
                    }
                    String hex = text.substring(index, index + 4);
                    try {
                        result.append((char) Integer.parseInt(hex, 16));
                    } catch (NumberFormatException exception) {
                        throw error("Unicodeエスケープが不正です: " + hex);
                    }
                    index += 4;
                }
                default -> throw error("未対応のエスケープです: " + escaped);
            }
        }
        throw error("文字列が閉じられていません");
    }

    private Object numberValue() {
        int start = index;
        if (peek('-')) {
            index++;
        }
        while (index < text.length() && Character.isDigit(text.charAt(index))) {
            index++;
        }
        if (peek('.')) {
            index++;
            while (index < text.length() && Character.isDigit(text.charAt(index))) {
                index++;
            }
        }
        if (peek('e') || peek('E')) {
            index++;
            if (peek('+') || peek('-')) {
                index++;
            }
            while (index < text.length() && Character.isDigit(text.charAt(index))) {
                index++;
            }
        }
        String number = text.substring(start, index);
        try {
            if (number.contains(".") || number.contains("e") || number.contains("E")) {
                return Double.parseDouble(number);
            }
            return Long.parseLong(number);
        } catch (NumberFormatException exception) {
            throw error("数値が不正です: " + number);
        }
    }

    private Object literal(String expected, Object result) {
        if (!text.startsWith(expected, index)) {
            throw error("不正なリテラルです");
        }
        index += expected.length();
        return result;
    }

    private void whitespace() {
        while (index < text.length() && Character.isWhitespace(text.charAt(index))) {
            index++;
        }
    }

    private boolean peek(char expected) {
        return index < text.length() && text.charAt(index) == expected;
    }

    private void expect(char expected) {
        if (!peek(expected)) {
            throw error("'" + expected + "' が必要です");
        }
        index++;
    }

    private IllegalArgumentException error(String message) {
        return new IllegalArgumentException(message + " (位置 " + index + ")");
    }
}
