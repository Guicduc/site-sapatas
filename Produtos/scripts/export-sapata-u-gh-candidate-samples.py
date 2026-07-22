# Rhino 7 IronPython. Exports one isolated 3MF/STL sample per validated U candidate.
import datetime
import json
import os
import traceback

import clr
import Rhino
import System
import rhinoscriptsyntax as rs
import scriptcontext as sc


REPO_ROOT = os.environ.get("TRACO_BASE_REPO", r"C:\Users\Administrador\Desktop\SCRIPTS\site-sapatas")
STATE_DIR = os.path.join(REPO_ROOT, ".local-data", "gh-repair-u")
CANDIDATE_DIR = os.path.join(STATE_DIR, "candidates-archive")
OUTPUT_DIR = os.path.join(STATE_DIR, "candidate-samples")
REPORT_PATH = os.path.join(STATE_DIR, "candidate-sample-export-report.json")
TARGETS = [
    ("Sapata_U_SemHaste.gh", "SDiff", "sapata-u-sem-haste-candidate"),
    ("Sapata_U_ComHaste.gh", "SUnion", "sapata-u-com-haste-candidate"),
]


def load_grasshopper():
    clr.AddReferenceToFileAndPath(r"C:\Program Files\Rhino 7\Plug-ins\Grasshopper\Grasshopper.dll")
    import Grasshopper
    return Grasshopper


def clear_doc():
    sc.doc = Rhino.RhinoDoc.ActiveDoc
    for obj in list(sc.doc.Objects):
        sc.doc.Objects.Delete(obj.Id, True)


def output_by_name(ghdoc):
    matches = []
    for obj in ghdoc.Objects:
        try:
            outputs = obj.Params.Output
        except:
            continue
        for output in outputs:
            if (output.NickName or output.Name or "").strip().upper() == "EXPORT_3MF":
                matches.append((obj, output))
    if len(matches) != 1:
        raise Exception("EXPORT_3MF esperado uma vez, encontrado {}".format(len(matches)))
    return matches[0]


def final_solid(output):
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
                return value
    raise Exception("EXPORT_3MF nao produziu Brep solido")


def export_one(Grasshopper, filename, expected_final, sample_slug):
    path = os.path.join(CANDIDATE_DIR, filename)
    io = Grasshopper.Kernel.GH_DocumentIO()
    if not io.Open(path):
        raise Exception("Nao abriu candidato")
    ghdoc = io.Document
    ghdoc.Enabled = True
    ghdoc.NewSolution(True)
    component, output = output_by_name(ghdoc)
    if (component.NickName or "") != expected_final:
        raise Exception("Output final incorreto: {}".format(component.NickName))
    geometry = final_solid(output)
    clear_doc()
    object_id = Rhino.RhinoDoc.ActiveDoc.Objects.AddBrep(geometry)
    if object_id == System.Guid.Empty:
        raise Exception("Falha ao adicionar solido ao documento temporario")
    rhino_object = Rhino.RhinoDoc.ActiveDoc.Objects.Find(object_id)
    rhino_object.Select(True)
    path_3mf = os.path.join(OUTPUT_DIR, sample_slug + ".3mf")
    path_stl = os.path.join(OUTPUT_DIR, sample_slug + ".stl")
    if not Rhino.RhinoApp.RunScript('-_Export "{}" _Enter'.format(path_3mf), False):
        raise Exception("Falha exportando 3MF")
    rs.Command("_SelNone", False)
    rhino_object.Select(True)
    if not Rhino.RhinoApp.RunScript('-_Export "{}" _Enter _Enter'.format(path_stl), False):
        raise Exception("Falha exportando STL")
    bbox = geometry.GetBoundingBox(True)
    volume = Rhino.Geometry.VolumeMassProperties.Compute(geometry)
    if not os.path.isfile(path_3mf) or not os.path.isfile(path_stl):
        raise Exception("Exportacao nao criou ambos os arquivos")
    return {
        "candidate": path,
        "export_component": component.NickName,
        "model_3mf": path_3mf,
        "stl": path_stl,
        "bytes_3mf": os.path.getsize(path_3mf),
        "bytes_stl": os.path.getsize(path_stl),
        "volume": float(volume.Volume) if volume else 0.0,
        "bbox": [float(bbox.Max.X - bbox.Min.X), float(bbox.Max.Y - bbox.Min.Y), float(bbox.Max.Z - bbox.Min.Z)],
    }


def main():
    if not os.path.isdir(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
    Grasshopper = load_grasshopper()
    report = {"started_at": datetime.datetime.utcnow().isoformat() + "Z", "targets": []}
    for filename, expected_final, sample_slug in TARGETS:
        try:
            item = export_one(Grasshopper, filename, expected_final, sample_slug)
            item["status"] = "exported"
        except:
            item = {"candidate": os.path.join(CANDIDATE_DIR, filename), "status": "failed", "error": traceback.format_exc()}
        report["targets"].append(item)
    report["finished_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    report["status"] = "exported" if all(item["status"] == "exported" for item in report["targets"]) else "failed"
    with open(REPORT_PATH, "w") as handle:
        handle.write(json.dumps(report, indent=2, sort_keys=True))


main()
