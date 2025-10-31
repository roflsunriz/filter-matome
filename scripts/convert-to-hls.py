#!/usr/bin/env python3
"""任意の動画をCMAF対応HLS(fMP4)へ変換するユーティリティ"""

import argparse
import json
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Iterable, List, Optional, Sequence

VIDEO_EXTENSIONS = {
    ".mp4",
    ".mkv",
    ".mov",
    ".avi",
    ".wmv",
    ".flv",
    ".ts",
    ".m2ts",
    ".webm",
}

VIDEO_PLAYLIST = "video.m3u8"
AUDIO_PLAYLIST = "audio.m3u8"
VIDEO_INIT_SEGMENT = "video/init01.cmfv"
AUDIO_INIT_SEGMENT = "audio/init01.cmfa"
VIDEO_SEGMENT_PATTERN = "video/%03d.cmfv"
AUDIO_SEGMENT_PATTERN = "audio/%03d.cmfa"
DEFAULT_VIDEO_BANDWIDTH = 5_000_000


class ConversionError(Exception):
    """変換処理で発生したエラーを表す例外"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "入力ファイルがH.264/MP4の場合は映像・音声をコピーし、"
            "それ以外はH.264へ再エンコードしてfMP4ベースのHLS(VOD)を出力します。"
        )
    )
    parser.add_argument(
        "inputs",
        nargs="+",
        help="変換する動画ファイルまたはフォルダ。フォルダの場合は既定の拡張子を探索します。",
    )
    parser.add_argument(
        "-o",
        "--output",
        help=(
            "出力先ディレクトリ。複数ファイルを処理する場合は、"
            "各ファイル名のサブフォルダがこの配下に作成されます。"
        ),
    )
    parser.add_argument(
        "--segment-duration",
        type=int,
        default=6,
        help="HLSセグメント長(秒)。 (既定値: 6)",
    )
    parser.add_argument(
        "--crf",
        type=int,
        default=20,
        help="H.264再エンコード時のCRF値。値が低いほど高品質。 (既定値: 20)",
    )
    parser.add_argument(
        "--preset",
        default="veryfast",
        help="H.264再エンコード時に使用するx264プリセット。 (例: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow) (既定値: veryfast)",
    )
    parser.add_argument(
        "--audio-bitrate",
        default="192k",
        help="AACエンコード時のビットレート。 (既定値: 192k)",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="既存の出力ディレクトリが存在する場合に削除して再作成します。",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="ffmpegコマンドを表示するだけで実行しません。",
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        help="フォルダ入力時にサブフォルダも探索します。",
    )
    return parser.parse_args()


def ensure_ffmpeg_available() -> None:
    if shutil.which("ffmpeg") is None:
        raise ConversionError("ffmpegが見つかりません。PATHを確認してください。")
    if shutil.which("ffprobe") is None:
        raise ConversionError("ffprobeが見つかりません。PATHを確認してください。")


def gather_input_files(paths: Iterable[str], recursive: bool) -> List[Path]:
    files: List[Path] = []
    for raw in paths:
        path = Path(raw).expanduser().resolve()
        if path.is_file():
            files.append(path)
            continue
        if path.is_dir():
            pattern = "**/*" if recursive else "*"
            for candidate in path.glob(pattern):
                if candidate.is_file() and candidate.suffix.lower() in VIDEO_EXTENSIONS:
                    files.append(candidate.resolve())
            continue
        raise ConversionError(f"入力パスが存在しません: {raw}")
    if not files:
        raise ConversionError("処理対象の動画ファイルが見つかりません。")
    return sorted(set(files))


def parse_optional_int(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def probe_media(path: Path) -> dict:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_streams",
        "-show_format",
        str(path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=False)
    if result.returncode != 0:
        try:
            stderr_text = result.stderr.decode("utf-8")
        except UnicodeDecodeError:
            stderr_text = result.stderr.decode("utf-8", errors="replace")
        raise ConversionError(f"ffprobeの実行に失敗しました: {stderr_text.strip()}")

    try:
        stdout_text = result.stdout.decode("utf-8")
    except UnicodeDecodeError:
        stdout_text = result.stdout.decode("utf-8", errors="replace")

    try:
        data = json.loads(stdout_text)
    except json.JSONDecodeError as exc:
        raise ConversionError("ffprobeの出力解析に失敗しました。") from exc
    streams = data.get("streams", [])
    format_info = data.get("format", {})

    from typing import Dict, Any

    video_stream: Dict[str, Any] = next((s for s in streams if s.get("codec_type") == "video"), {})
    audio_stream: Dict[str, Any] = next((s for s in streams if s.get("codec_type") == "audio"), {})

    return {
        "video_codec": video_stream.get("codec_name", ""),
        "audio_codec": audio_stream.get("codec_name", ""),
        "format_name": format_info.get("format_name", ""),
        "has_audio": bool(audio_stream),
        "video_bit_rate": parse_optional_int(video_stream.get("bit_rate")),
        "audio_bit_rate": parse_optional_int(audio_stream.get("bit_rate")),
    }


def should_copy_streams(video_codec: str, format_name: str, input_path: Path) -> bool:
    if video_codec != "h264":
        return False
    if input_path.suffix.lower() != ".mp4":
        return False
    if not format_name:
        return True
    return "mp4" in {name.strip() for name in format_name.split(",")}


def prepare_output_dir(input_file: Path, output_root: Optional[Path], overwrite: bool) -> Path:
    if output_root is None:
        out_dir = input_file.parent / f"{input_file.stem}.hls"
    else:
        output_root = output_root.resolve()
        out_dir = output_root / f"{input_file.stem}.hls"

    if out_dir.exists():
        if not overwrite:
            raise ConversionError(f"出力ディレクトリが既に存在します: {out_dir}")
        if not out_dir.is_dir():
            raise ConversionError(f"ファイルが存在するため出力ディレクトリを作成できません: {out_dir}")
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    return out_dir


def parse_bitrate_string(value: str) -> int:
    cleaned = value.strip().lower()
    if cleaned.endswith("k"):
        return int(float(cleaned[:-1]) * 1000)
    if cleaned.endswith("m"):
        return int(float(cleaned[:-1]) * 1_000_000)
    return int(float(cleaned))


def build_codecs_string(video_codec: str, audio_codec: Optional[str], has_audio: bool) -> str:
    video_tag = "avc1.4d401f" if video_codec == "h264" else (video_codec or "avc1.4d401f")
    if not has_audio:
        return video_tag
    audio_map = {
        "aac": "mp4a.40.2",
        "mp3": "mp4a.40.34",
        "ac3": "ac-3",
        "eac3": "ec-3",
    }
    audio_tag = audio_map.get((audio_codec or "").lower(), audio_codec or "mp4a.40.2")
    return f"{video_tag},{audio_tag}"


def calculate_bandwidth(
    video_bit_rate: Optional[int],
    audio_bit_rate: Optional[int],
    has_audio: bool,
    audio_bitrate_setting: str,
) -> int:
    video_bw = video_bit_rate or DEFAULT_VIDEO_BANDWIDTH
    if not has_audio:
        return max(1, video_bw)
    audio_bw = audio_bit_rate or parse_bitrate_string(audio_bitrate_setting)
    return max(1, video_bw + audio_bw)


def build_ffmpeg_command(
    input_file: Path,
    copy_av: bool,
    has_audio: bool,
    segment_duration: int,
    crf: int,
    preset: str,
    audio_bitrate: str,
) -> Sequence[str]:
    cmd: List[str] = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_file),
        "-map",
        "0:v:0",
    ]

    if copy_av:
        cmd.extend(["-c:v", "copy"])
    else:
        cmd.extend([
            "-c:v",
            "libx264",
            "-preset",
            preset,
            "-crf",
            str(crf),
            "-pix_fmt",
            "yuv420p",
        ])

    cmd.extend([
        "-f",
        "hls",
        "-hls_time",
        str(segment_duration),
        "-movflags",
        "cmaf",
        "-hls_segment_type",
        "fmp4",
        "-hls_playlist_type",
        "vod",
        "-hls_flags",
        "independent_segments",
        "-start_number",
        "1",
        "-hls_fmp4_init_filename",
        VIDEO_INIT_SEGMENT,
        "-hls_segment_filename",
        VIDEO_SEGMENT_PATTERN,
        VIDEO_PLAYLIST,
    ])

    if has_audio:
        cmd.extend([
            "-map",
            "0:a:0?",
        ])
        if copy_av:
            cmd.extend(["-c:a", "copy"])
        else:
            cmd.extend([
                "-c:a",
                "aac",
                "-b:a",
                audio_bitrate,
                "-ac",
                "2",
            ])
        cmd.extend([
            "-f",
            "hls",
            "-hls_time",
            str(segment_duration),
            "-movflags",
            "cmaf",
            "-hls_segment_type",
            "fmp4",
            "-hls_playlist_type",
            "vod",
            "-hls_flags",
            "independent_segments",
            "-start_number",
            "1",
            "-hls_fmp4_init_filename",
            AUDIO_INIT_SEGMENT,
            "-hls_segment_filename",
            AUDIO_SEGMENT_PATTERN,
            AUDIO_PLAYLIST,
        ])

    return cmd


def run_command(cmd: Sequence[str], dry_run: bool, cwd: Path) -> None:
    printable = " ".join(shlex.quote(part) for part in cmd)
    print(f"実行コマンド: {printable}")
    if dry_run:
        return

    process = subprocess.run(cmd, cwd=str(cwd))
    if process.returncode != 0:
        raise ConversionError("ffmpegの実行中にエラーが発生しました。")


def ensure_output_structure(out_dir: Path, has_audio: bool) -> None:
    (out_dir / "video").mkdir(parents=True, exist_ok=True)
    if has_audio:
        (out_dir / "audio").mkdir(parents=True, exist_ok=True)


def ensure_playlist_prefixes(playlist_path: Path, prefix: str) -> None:
    if not playlist_path.exists():
        return

    original_lines = playlist_path.read_text(encoding="utf-8").splitlines()
    adjusted_lines = []

    for line in original_lines:
        stripped = line.strip()
        if not stripped:
            adjusted_lines.append("")
            continue
        if stripped.startswith("#EXT-X-MAP:"):
            def _replacer(match: re.Match) -> str:
                uri = match.group(2)
                if uri.startswith(prefix):
                    return match.group(0)
                return f'{match.group(1)}{prefix}{uri}{match.group(3)}'

            adjusted_lines.append(
                re.sub(r'(URI=")(.*?)(")', _replacer, line)
            )
            continue
        if stripped.startswith("#"):
            adjusted_lines.append(line)
            continue
        if stripped.startswith(prefix):
            adjusted_lines.append(stripped)
        else:
            adjusted_lines.append(f"{prefix}{stripped}")

    playlist_path.write_text("\n".join(adjusted_lines) + "\n", encoding="utf-8")


def write_master_playlist(
    out_dir: Path,
    video_codec: str,
    audio_codec: Optional[str],
    has_audio: bool,
    bandwidth: int,
) -> None:
    lines = [
        "#EXTM3U",
        "#EXT-X-VERSION:6",
        "#EXT-X-INDEPENDENT-SEGMENTS",
    ]
    if has_audio:
        lines.append('#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Default",AUTOSELECT=YES,URI="audio.m3u8"')
        lines.append(
            f'#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},CODECS="{build_codecs_string(video_codec, audio_codec, True)}",AUDIO="audio"'
        )
    else:
        lines.append(
            f'#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},CODECS="{build_codecs_string(video_codec, None, False)}"'
        )
    lines.append(VIDEO_PLAYLIST)
    master_path = out_dir / "master.m3u8"
    master_content = "\n".join(lines) + "\n"
    master_path.write_text(master_content, encoding="utf-8")


def process_file(
    input_file: Path,
    output_root: Optional[Path],
    args: argparse.Namespace,
) -> None:
    print(f"処理開始: {input_file}")
    media_info = probe_media(input_file)
    copy_av = should_copy_streams(media_info["video_codec"], media_info["format_name"], input_file)
    out_dir = prepare_output_dir(input_file, output_root, args.overwrite)
    ensure_output_structure(out_dir, media_info["has_audio"])
    cmd = build_ffmpeg_command(
        input_file=input_file,
        copy_av=copy_av,
        has_audio=media_info["has_audio"],
        segment_duration=args.segment_duration,
        crf=args.crf,
        preset=args.preset,
        audio_bitrate=args.audio_bitrate,
    )

    if copy_av:
        print("入力映像がH.264/MP4のため映像・音声をコピーします。")
    else:
        print("入力映像をH.264へ再エンコードします。")

    run_command(cmd, args.dry_run, cwd=out_dir)

    if not args.dry_run:
        ensure_playlist_prefixes(out_dir / VIDEO_PLAYLIST, "video/")
        if media_info["has_audio"]:
            ensure_playlist_prefixes(out_dir / AUDIO_PLAYLIST, "audio/")
        bandwidth = calculate_bandwidth(
            media_info["video_bit_rate"],
            media_info["audio_bit_rate"],
            media_info["has_audio"],
            args.audio_bitrate,
        )
        video_codec_for_master = "h264" if not copy_av else (media_info["video_codec"] or "h264")
        write_master_playlist(
            out_dir=out_dir,
            video_codec=video_codec_for_master,
            audio_codec=media_info["audio_codec"] if media_info["has_audio"] else None,
            has_audio=media_info["has_audio"],
            bandwidth=bandwidth,
        )

    print(f"完了: {input_file} -> {out_dir}")


def main() -> int:
    try:
        args = parse_args()
        ensure_ffmpeg_available()
        output_root = Path(args.output).expanduser().resolve() if args.output else None
        if output_root is not None and not output_root.exists():
            output_root.mkdir(parents=True, exist_ok=True)
        files = gather_input_files(args.inputs, args.recursive)
        for file_path in files:
            process_file(file_path, output_root, args)
        print("すべての処理が完了しました。")
        return 0
    except ConversionError as exc:
        print(f"エラー: {exc}")
        return 1
    except KeyboardInterrupt:
        print("ユーザーにより中断されました。")
        return 130


if __name__ == "__main__":
    sys.exit(main())
