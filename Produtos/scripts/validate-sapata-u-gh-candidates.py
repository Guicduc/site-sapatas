# Rhino 7 IronPython. Read-only validation of archive-repair candidates.
import datetime
import json
import os
import traceback

import clr
import Rhino


REPO_ROOT = os.environ.get("TRACO_BASE_REPO", r"C:\Users\Administrador\Desktop\SCRIPTS\site-sapatas")
STATE_DIR = os.path.join(REPO_ROOT, ".local-data", "gh-repair-u")
CANDIDATE_DIR = os.path.join(STATE_DIR, "candidates-archive")
REPORT_PATH = os.path.join(STATE_DIR, "archive-candidate-runtime-report.json")
TARGETS = [
    ("Sapata_U_SemHaste.gh", "SDiff"),
    ("Sapata_U_ComHaste.gh", "SUnion"),
]


def load_grasshopper():
    clr.AddReferenceToFileAndPath(r"C:\Program Files\Rhino 7\Plug-ins\Grasshopper\Grasshopper.dll")
    import Grasshopper
    return Grasshopper


def text(value):
    try:
        return str(value)
    except:
        return ""


def output_by_name(ghdoc, name):
    matches = []
    for obj in ghdoc.Objects:
        try:
            outputs = obj.Params.Output
        except:
            continue
        for output in outputs:
            label = output.NickName or output.Name or ""
            if label.strip().upper() == name:
                matches.append((obj, output))
    if len(matches) != 1:
        raise Exception("Esperado 1 output {} e encontrei {}".format(name, len(matches)))
    return matches[0]


def runtime_messages(ghdoc):
    results = []
    for obj in ghdoc.Objects:
        try:
            messages = list(obj.RuntimeMessages(False))
        except:
            messages = []
        if messages:
            results.append({
                "nickname": text(obj.NickName),
                "type": text(obj.GetType().Name),
                "level": text(obj.RuntimeMessageLevel),
                "messages": [text(message) for message in messages],
            })
    return results


def validate_one(Grasshopper, path, expected_final):
    io = Grasshopper.Kernel.GH_DocumentIO()
    if not io.Open(path):
        raise Exception("Nao abriu candidato")
    ghdoc = io.Document
    ghdoc.Enabled = True
    ghdoc.NewSolution(True)
    obj, output = output_by_name(ghdoc, "EXPORT_3MF")
    if (obj.NickName or "") != expected_final:
        raise Exception("EXPORT_3MF conectado em {}, esperado {}".format(obj.NickName, expected_final))
    solids = []
    for path_item in output.VolatileData.Paths:
        for goo in output.VolatileData.get_Branch(path_item):
            value = None
            try:
                value = goo.Value
            except:
                pass
            if isinstance(value, Rhino.Geometry.Extrusion):
                value = value.ToBrep()
            if isinstance(value, Rhino.Geometry.Brep) and value.IsSolid:
                mass = Rhino.Geometry.VolumeMassProperties.Compute(value)
                bbox = value.GetBoundingBox(True)
                solids.append({
                    "volume": float(mass.Volume) if mass else 0.0,
                    "bbox": [
                        float(bbox.Max.X - bbox.Min.X),
                        float(bbox.Max.Y - bbox.Min.Y),
                        float(bbox.Max.Z - bbox.Min.Z),
                    ],
                })
    messages = runtime_messages(ghdoc)
    errors = [entry for entry in messages if "Error" in entry.get("level", "")]
    return {
        "export_component": text(obj.NickName),
        "export_component_type": text(obj.GetType().Name),
        "solid_count": len(solids),
        "solids": solids,
        "runtime_messages": messages,
        "runtime_errors": errors,
    }


def main():
    Grasshopper = load_grasshopper()
    report = {"started_at": datetime.datetime.utcnow().isoformat() + "Z", "targets": []}
    for filename, expected_final in TARGETS:
        path = os.path.join(CANDIDATE_DIR, filename)
        item = {"candidate": path, "status": "failed"}
        try:
            result = validate_one(Grasshopper, path, expected_final)
            item["validation"] = result
            item["status"] = "validated" if result["solid_count"] > 0 and not result["runtime_errors"] else "invalid_geometry"
        except:
            item["error"] = traceback.format_exc()
        report["targets"].append(item)
    report["finished_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    report["status"] = "validated" if all(item["status"] == "validated" for item in report["targets"]) else "failed"
    with open(REPORT_PATH, "w") as handle:
        handle.write(json.dumps(report, indent=2, sort_keys=True))
    print("GH_ARCHIVE_CANDIDATE_STATUS {}".format(report["status"]))


main()
