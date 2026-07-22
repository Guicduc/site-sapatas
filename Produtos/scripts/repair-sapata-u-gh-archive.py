"""Create isolated Grasshopper U repair candidates without starting Rhino.

The known bad object already owns the five intended point wires and is the only
source of Nurbs.Vertices.  Its serialized *component class* is Panel, which
casts the wires to text.  This patch changes only that class identifier to the
built-in Point parameter class, preserving the object and wire GUIDs.  It also
renames the existing final solid output to EXPORT_3MF.  The original files are
never written by this script.
"""

from __future__ import annotations

import datetime as dt
import json
import shutil
import struct
import uuid
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
GH_DIR = ROOT / "Produtos" / "Scripts-GH"
STATE_DIR = ROOT / ".local-data" / "gh-repair-u"
BACKUP_DIR = STATE_DIR / "backups"
CANDIDATE_DIR = STATE_DIR / "candidates-archive"
REPORT_PATH = STATE_DIR / "archive-repair-report.json"

PANEL_INSTANCE_GUID = uuid.UUID("6ab4986f-3863-4ae8-beb1-6d30cc676b36")
NURBS_VERTICES_GUID = uuid.UUID("22e0f421-6982-48d0-bdc9-438b4ead2456")
PANEL_CLASS_GUID = uuid.UUID("59e0b89a-e487-49f8-bab8-b5bab16be14c")
POINT_CLASS_GUID = uuid.UUID("fbac3e32-f100-4292-8692-77240a42fd1a")

TARGETS = (
    ("Sapata_U_SemHaste.gh", "SDiff"),
    ("Sapata_U_ComHaste.gh", "SUnion"),
)


def object_spans(raw: bytes) -> list[tuple[int, int]]:
    starts = []
    offset = 0
    marker = b"\x06Object"
    while True:
        offset = raw.find(marker, offset)
        if offset < 0:
            break
        # Object chunks always have index/type/count fields after the name.
        if offset + 18 <= len(raw):
            starts.append(offset)
        offset += len(marker)
    return list(zip(starts, starts[1:] + [len(raw)]))


def archive_guid_tag(name: str, value: uuid.UUID, index: int = -1) -> bytes:
    return bytes([len(name)]) + name.encode("ascii") + struct.pack("<iI", index, 9) + value.bytes_le


def archive_string_tag(name: str, value: str, index: int = -1) -> bytes:
    encoded = value.encode("utf-8")
    if len(encoded) > 255:
        raise ValueError("GH archive short-string limit exceeded")
    return bytes([len(name)]) + name.encode("ascii") + struct.pack("<iI", index, 10) + bytes([len(encoded)]) + encoded


def chunk_contains_guid(chunk: bytes, name: str, value: uuid.UUID) -> bool:
    return archive_guid_tag(name, value) in chunk


def top_level_nickname(chunk: bytes) -> str | None:
    marker = archive_string_tag("NickName", "")[:-1]
    index = chunk.find(marker)
    if index < 0:
        return None
    length_offset = index + len(marker)
    length = chunk[length_offset]
    return chunk[length_offset + 1 : length_offset + 1 + length].decode("utf-8", "replace")


def replace_exact_once(raw: bytes, old: bytes, new: bytes, label: str) -> bytes:
    count = raw.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: esperado 1 trecho, encontrei {count}")
    return raw.replace(old, new, 1)


def point_relay_patch(raw: bytes) -> tuple[bytes, dict]:
    panel_tag = archive_guid_tag("InstanceGuid", PANEL_INSTANCE_GUID)
    vertices_tag = archive_guid_tag("InstanceGuid", NURBS_VERTICES_GUID)
    panel_spans = [
        (start, end)
        for start, end in object_spans(raw)
        if panel_tag in raw[start:end]
    ]
    if len(panel_spans) != 1:
        raise RuntimeError(f"Panel alvo: esperado 1 objeto, encontrei {len(panel_spans)}")
    start, end = panel_spans[0]
    panel = raw[start:end]
    if archive_guid_tag("GUID", PANEL_CLASS_GUID) not in panel:
        raise RuntimeError("Panel alvo nao possui classe Panel esperada")
    source_marker = b"\x06Source"
    source_count = panel.count(source_marker)
    if source_count != 5:
        raise RuntimeError(f"Panel alvo deve preservar 5 fontes, encontrei {source_count}")
    if raw.count(vertices_tag) != 1:
        raise RuntimeError("Entrada Nurbs.Vertices nao encontrada de modo univoco")

    patched_panel = replace_exact_once(
        panel,
        archive_guid_tag("GUID", PANEL_CLASS_GUID),
        archive_guid_tag("GUID", POINT_CLASS_GUID),
        "classe Panel",
    )
    # Deserializers identify the object from its GUID.  Keep the serialized
    # display labels intact: there are two Panel name fields in this old
    # archive, and changing cosmetic metadata is unnecessary to repair data.
    return raw[:start] + patched_panel + raw[end:], {
        "panel_object_offset": start,
        "point_source_count": source_count,
        "vertices_guid": str(NURBS_VERTICES_GUID),
    }


def export_output_patch(raw: bytes, final_nickname: str) -> tuple[bytes, dict]:
    final_spans = [
        (start, end)
        for start, end in object_spans(raw)
        if top_level_nickname(raw[start:end]) == final_nickname
    ]
    if not final_spans:
        raise RuntimeError(f"Componente final {final_nickname} nao encontrado")
    # SDiff has an earlier base-cylinder boolean; the right-most/last object is
    # the finished body. SUnion only has one occurrence.
    start, end = final_spans[-1]
    final = raw[start:end]
    output_start = final.find(b"\x0cparam_output")
    if output_start < 0:
        raise RuntimeError(f"{final_nickname} nao possui param_output")
    output = final[output_start:]
    result_name = archive_string_tag("Name", "Result")
    if result_name not in output:
        raise RuntimeError(f"{final_nickname} nao possui output Result esperado")
    old_nickname = archive_string_tag("NickName", "R")
    new_nickname = archive_string_tag("NickName", "EXPORT_3MF")
    # Restrict the replacement to this final component; the old nickname is
    # intentionally a one-byte output label and must occur exactly once here.
    final = replace_exact_once(final, old_nickname, new_nickname, f"saida {final_nickname}")
    return raw[:start] + final + raw[end:], {
        "final_component": final_nickname,
        "final_object_offset": start,
        "export_output": "EXPORT_3MF",
    }


def create_candidate(source: Path, final_nickname: str) -> dict:
    backup = BACKUP_DIR / f"{source.name}.before-archive-point-relay.bak"
    candidate = CANDIDATE_DIR / source.name
    if not backup.exists():
        shutil.copy2(source, backup)
    compressed = source.read_bytes()
    raw = zlib.decompress(compressed, wbits=-zlib.MAX_WBITS)
    raw, point_info = point_relay_patch(raw)
    raw, export_info = export_output_patch(raw, final_nickname)
    candidate.write_bytes(zlib.compress(raw, level=9, wbits=-zlib.MAX_WBITS))
    reread = zlib.decompress(candidate.read_bytes(), wbits=-zlib.MAX_WBITS)
    if b"EXPORT_3MF" not in reread:
        raise RuntimeError("Candidato gravado sem EXPORT_3MF")
    return {
        "source": str(source),
        "backup": str(backup),
        "candidate": str(candidate),
        "source_bytes": len(compressed),
        "candidate_bytes": candidate.stat().st_size,
        "point_relay": point_info,
        "export": export_info,
        "status": "candidate_written",
    }


def main() -> None:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    CANDIDATE_DIR.mkdir(parents=True, exist_ok=True)
    report = {"created_at": dt.datetime.now(dt.timezone.utc).isoformat(), "targets": []}
    for filename, final_nickname in TARGETS:
        try:
            report["targets"].append(create_candidate(GH_DIR / filename, final_nickname))
        except Exception as exc:
            report["targets"].append({"source": str(GH_DIR / filename), "status": "failed", "error": repr(exc)})
    report["status"] = "candidate_written" if all(item["status"] == "candidate_written" for item in report["targets"]) else "failed"
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if report["status"] != "candidate_written":
        raise SystemExit(report["status"])


if __name__ == "__main__":
    main()
