# Rhino 7 IronPython script.
# Opens Grasshopper definitions, generates slider variations, exports final solids to 3MF,
# and writes a geometry dataset for downstream Orca slicing.

import csv
import datetime
import os
import re
import traceback

import clr
import Rhino
import rhinoscriptsyntax as rs
import scriptcontext as sc
import System


REPO_ROOT = os.environ.get("TRACO_BASE_REPO", r"C:\Users\Administrador\Desktop\SCRIPTS\site-sapatas")
GH_DIR = os.path.join(REPO_ROOT, "Produtos", "Scripts-GH")
OUT_DIR = os.path.join(REPO_ROOT, "Produtos", "3MF")
STL_DIR = os.path.join(REPO_ROOT, "Produtos", "STL")
DATASET_DIR = os.path.join(REPO_ROOT, "Produtos", "datasets")
LOG_DIR = os.path.join(REPO_ROOT, "Produtos", "logs")
DATASET_PATH = os.path.join(DATASET_DIR, "grasshopper_3mf_variations.csv")
LOG_PATH = os.path.join(LOG_DIR, "grasshopper_3mf_variations.log")
VARIATIONS_PER_FILE = int(os.environ.get("GH_VARIATIONS_PER_FILE", "120"))
TARGET_VALID_PER_FILE = int(os.environ.get("GH_TARGET_VALID_PER_FILE", str(VARIATIONS_PER_FILE)))
SAMPLE_OFFSET = int(os.environ.get("GH_SAMPLE_OFFSET", "0"))
ONLY_FILTER = os.environ.get("GH_ONLY", "").lower()
APPEND_DATASET = os.environ.get("GH_APPEND_DATASET", "false").lower() == "true"


def log(message):
    line = "[{}] {}".format(datetime.datetime.now().isoformat(), message)
    print(line)
    with open(LOG_PATH, "a") as handle:
        handle.write(line + "\n")


def ensure_dirs():
    for folder in [OUT_DIR, STL_DIR, DATASET_DIR, LOG_DIR]:
        if not os.path.isdir(folder):
            os.makedirs(folder)


def load_grasshopper():
    clr.AddReferenceToFileAndPath(r"C:\Program Files\Rhino 7\Plug-ins\Grasshopper\Grasshopper.dll")
    import Grasshopper
    return Grasshopper


def slug(value):
    text = re.sub(r"[^A-Za-z0-9._-]+", "-", value or "").strip("-")
    return text or "modelo"


def list_gh_files():
    files = []
    for name in os.listdir(GH_DIR):
        if name.lower().endswith(".gh"):
            if ONLY_FILTER and ONLY_FILTER not in name.lower():
                continue
            files.append(os.path.join(GH_DIR, name))
    files.sort()
    return files


def clear_doc():
    sc.doc = Rhino.RhinoDoc.ActiveDoc
    ids = [obj.Id for obj in sc.doc.Objects]
    for object_id in ids:
        sc.doc.Objects.Delete(object_id, True)
    sc.doc.Views.Redraw()


def open_gh_document(Grasshopper, gh_path):
    io = Grasshopper.Kernel.GH_DocumentIO()
    if not io.Open(gh_path):
        raise Exception("Nao foi possivel abrir {}".format(gh_path))
    return io.Document


def get_number_sliders(ghdoc):
    sliders = []
    for obj in ghdoc.Objects:
        if obj.GetType().FullName == "Grasshopper.Kernel.Special.GH_NumberSlider":
            sliders.append(obj)
    sliders.sort(key=lambda item: item.NickName or item.Name or str(item.InstanceGuid))
    return sliders


def slider_min(slider):
    try:
        return float(slider.Slider.Minimum)
    except:
        return 0.0


def slider_max(slider):
    try:
        return float(slider.Slider.Maximum)
    except:
        return 1.0


def slider_decimals(slider):
    try:
        return int(slider.Slider.DecimalPlaces)
    except:
        return 0


def slider_current(slider):
    try:
        return float(slider.Slider.Value)
    except:
        try:
            return float(slider.CurrentValue)
        except:
            return (slider_min(slider) + slider_max(slider)) / 2.0


def set_slider(slider, value):
    decimals = slider_decimals(slider)
    rounded = round(float(value), decimals)
    try:
        slider.SetSliderValue(System.Decimal(rounded))
    except:
        try:
            slider.Slider.Value = System.Decimal(rounded)
        except:
            log("Nao foi possivel definir slider {} = {}".format(slider.NickName, rounded))


def slider_name(slider, index):
    return slider.NickName or slider.Name or "slider_{}".format(index + 1)


def format_slider_value(value, decimals):
    if decimals <= 0:
        return int(round(float(value)))
    return round(float(value), decimals)


def slider_value_at_ratio(slider, ratio):
    minimum = slider_min(slider)
    maximum = slider_max(slider)
    decimals = slider_decimals(slider)
    if maximum <= minimum:
        return format_slider_value(minimum, decimals)
    value = minimum + (maximum - minimum) * ratio
    return format_slider_value(value, decimals)


def variation_value(index, slider_index, total, minimum, maximum, decimals):
    if maximum <= minimum:
        return format_slider_value(minimum, decimals)
    # Deterministic spread; each slider gets a different phase to avoid diagonal-only samples.
    phase = ((index * (slider_index + 3) * 7) + (slider_index * 11)) % total
    ratio = (phase + 0.5) / float(max(1, total))
    value = minimum + (maximum - minimum) * ratio
    return format_slider_value(value, decimals)


def build_anchor_variations(sliders):
    anchors = []
    if not sliders:
        return anchors

    profiles = [
        ("min", 0.0),
        ("small", 0.25),
        ("mid", 0.5),
        ("large", 0.75),
        ("max", 1.0),
    ]

    for label, ratio in profiles:
        values = {}
        for slider_index, slider in enumerate(sliders):
            values[slider_name(slider, slider_index)] = slider_value_at_ratio(slider, ratio)
        anchors.append((label, values))

    default_values = {}
    for slider_index, slider in enumerate(sliders):
        decimals = slider_decimals(slider)
        current = min(slider_max(slider), max(slider_min(slider), slider_current(slider)))
        default_values[slider_name(slider, slider_index)] = format_slider_value(current, decimals)
    anchors.append(("default", default_values))

    for active_index, active_slider in enumerate(sliders):
        for label, ratio in [("axis-min", 0.0), ("axis-max", 1.0)]:
            values = {}
            for slider_index, slider in enumerate(sliders):
                value_ratio = ratio if slider is active_slider else 0.5
                values[slider_name(slider, slider_index)] = slider_value_at_ratio(slider, value_ratio)
            anchors.append(("{}-{}".format(label, active_index + 1), values))

    # Pairwise low/high interactions catch common nonlinear cases without exploding the sample count.
    for left_index in range(len(sliders)):
        for right_index in range(left_index + 1, len(sliders)):
            for label, ratio in [("pair-low", 0.25), ("pair-high", 0.75)]:
                values = {}
                for slider_index, slider in enumerate(sliders):
                    value_ratio = ratio if slider_index in [left_index, right_index] else 0.5
                    values[slider_name(slider, slider_index)] = slider_value_at_ratio(slider, value_ratio)
                anchors.append(("{}-{}-{}".format(label, left_index + 1, right_index + 1), values))

    deduped = []
    seen = set()
    for label, values in anchors:
        key = tuple(sorted(values.items()))
        if key in seen:
            continue
        seen.add(key)
        deduped.append((label, values))
    return deduped


def build_lhs_variation(sliders, index, total):
    values = {}
    for slider_index, slider in enumerate(sliders):
        name = slider_name(slider, slider_index)
        minimum = slider_min(slider)
        maximum = slider_max(slider)
        decimals = slider_decimals(slider)
        values[name] = variation_value(index, slider_index, total, minimum, maximum, decimals)
    return values


def build_variation_plan(sliders, total):
    plan = []
    for label, values in build_anchor_variations(sliders):
        plan.append((label, values))

    lhs_index = 0
    while len(plan) < total:
        plan.append(("spread-{}".format(lhs_index + 1), build_lhs_variation(sliders, lhs_index, total)))
        lhs_index += 1
    return plan[:total]


def apply_variation(sliders, values):
    for slider_index, slider in enumerate(sliders):
        name = slider_name(slider, slider_index)
        set_slider(slider, values.get(name, slider_current(slider)))
    return values


def solve(ghdoc):
    ghdoc.Enabled = True
    ghdoc.NewSolution(True)


def geometry_from_goo(goo):
    value = None
    try:
        value = goo.Value
    except:
        pass
    if value is None:
        try:
            value = goo.ScriptVariable()
        except:
            pass
    if isinstance(value, Rhino.Geometry.GeometryBase):
        return value.Duplicate()
    return None


def is_exportable_solid(geom):
    if geom is None:
        return False
    if isinstance(geom, Rhino.Geometry.Extrusion):
        geom = geom.ToBrep()
    if isinstance(geom, Rhino.Geometry.Brep):
        if not geom.IsSolid:
            return False
    elif isinstance(geom, Rhino.Geometry.Mesh):
        if not geom.IsClosed:
            return False
    else:
        return False
    try:
        volume = Rhino.Geometry.VolumeMassProperties.Compute(geom)
        return volume is not None and volume.Volume > 0
    except:
        return False


def geometry_key(geom):
    bbox = geom.GetBoundingBox(True)
    volume = Rhino.Geometry.VolumeMassProperties.Compute(geom).Volume
    return (
        round(volume, 4),
        round(bbox.Min.X, 4),
        round(bbox.Min.Y, 4),
        round(bbox.Min.Z, 4),
        round(bbox.Max.X, 4),
        round(bbox.Max.Y, 4),
        round(bbox.Max.Z, 4),
    )


def collect_geometries(ghdoc):
    found = []
    seen = set()
    for obj in ghdoc.Objects:
        try:
            outputs = obj.Params.Output
        except:
            outputs = []
        for output in outputs:
            try:
                paths = output.VolatileData.Paths
            except:
                continue
            for path_item in paths:
                branch = output.VolatileData.get_Branch(path_item)
                for goo in branch:
                    geom = geometry_from_goo(goo)
                    if isinstance(geom, Rhino.Geometry.Extrusion):
                        geom = geom.ToBrep()
                    if not is_exportable_solid(geom):
                        continue
                    key = geometry_key(geom)
                    if key in seen:
                        continue
                    seen.add(key)
                    found.append(geom)
    return found


def add_geometry(geom):
    sc.doc = Rhino.RhinoDoc.ActiveDoc
    if isinstance(geom, Rhino.Geometry.Mesh):
        return sc.doc.Objects.AddMesh(geom)
    if isinstance(geom, Rhino.Geometry.Extrusion):
        geom = geom.ToBrep()
    return sc.doc.Objects.AddBrep(geom)


def select_only(object_id):
    sc.doc = Rhino.RhinoDoc.ActiveDoc
    rs.Command("_SelNone", False)
    obj = sc.doc.Objects.Find(object_id)
    if obj:
        obj.Select(True)
    sc.doc.Views.Redraw()


def export_3mf(path, object_id):
    select_only(object_id)
    command = '-_Export "{}" _Enter'.format(path)
    Rhino.RhinoApp.RunScript(command, False)


def export_stl(path, object_id):
    select_only(object_id)
    command = '-_Export "{}" _Enter _Enter'.format(path)
    Rhino.RhinoApp.RunScript(command, False)


def metrics(rhino_object):
    geom = rhino_object.Geometry
    bbox = geom.GetBoundingBox(True)
    area = Rhino.Geometry.AreaMassProperties.Compute(geom)
    volume = Rhino.Geometry.VolumeMassProperties.Compute(geom)
    return {
        "object_type": geom.GetType().Name,
        "area_model_units2": area.Area if area else 0,
        "volume_model_units3": volume.Volume if volume else 0,
        "bbox_x": bbox.Max.X - bbox.Min.X,
        "bbox_y": bbox.Max.Y - bbox.Min.Y,
        "bbox_z": bbox.Max.Z - bbox.Min.Z,
    }


def process_file(Grasshopper, gh_path):
    rows = []
    base_name = os.path.splitext(os.path.basename(gh_path))[0]
    family_slug = slug(base_name)
    log("Processando {}".format(os.path.basename(gh_path)))
    ghdoc = open_gh_document(Grasshopper, gh_path)
    sliders = get_number_sliders(ghdoc)
    log("{} sliders encontrados em {}".format(len(sliders), os.path.basename(gh_path)))

    if len(sliders) == 0:
        log("Sem sliders numericos; gerando apenas a solucao padrao.")

    variation_plan = build_variation_plan(sliders, VARIATIONS_PER_FILE) if sliders else [("default", {})]

    for index, item in enumerate(variation_plan):
        variation_label, planned_values = item
        clear_doc()
        slider_values = apply_variation(sliders, planned_values) if sliders else {}
        solve(ghdoc)
        geometries = collect_geometries(ghdoc)
        if not geometries:
            log("Sem solidos exportaveis: {} variacao {}".format(base_name, index + 1))
            continue

        # Use the largest solid as the final candidate when the definition exposes auxiliaries.
        geometries.sort(key=lambda geom: Rhino.Geometry.VolumeMassProperties.Compute(geom).Volume, reverse=True)
        geom = geometries[0]
        object_id = add_geometry(geom)
        rhino_object = Rhino.RhinoDoc.ActiveDoc.Objects.Find(object_id)
        sample_id = "{}__v{:02d}".format(family_slug, SAMPLE_OFFSET + index + 1)
        output_path = os.path.join(OUT_DIR, sample_id + ".3mf")
        stl_path = os.path.join(STL_DIR, sample_id + ".stl")
        export_3mf(output_path, object_id)
        export_stl(stl_path, object_id)

        row = {
            "source_gh": os.path.relpath(gh_path, REPO_ROOT).replace("\\", "/"),
            "sample_id": sample_id,
            "variation_index": index + 1,
            "variation_label": variation_label,
            "slider_values": repr(slider_values),
            "export_path": os.path.relpath(output_path, REPO_ROOT).replace("\\", "/"),
            "stl_path": os.path.relpath(stl_path, REPO_ROOT).replace("\\", "/"),
        }
        row.update(metrics(rhino_object))
        rows.append(row)
        log("Exportado {}".format(output_path))
        if len(rows) >= TARGET_VALID_PER_FILE:
            break
    return rows


def write_dataset(rows):
    headers = [
        "source_gh",
        "sample_id",
        "variation_index",
        "variation_label",
        "slider_values",
        "export_path",
        "stl_path",
        "object_type",
        "area_model_units2",
        "volume_model_units3",
        "bbox_x",
        "bbox_y",
        "bbox_z",
    ]
    mode = "ab" if APPEND_DATASET and os.path.isfile(DATASET_PATH) else "wb"
    with open(DATASET_PATH, mode) as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        if mode == "wb":
            writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main():
    ensure_dirs()
    if os.path.isfile(LOG_PATH):
        os.remove(LOG_PATH)
    Grasshopper = load_grasshopper()
    all_rows = []
    for gh_path in list_gh_files():
        try:
            all_rows.extend(process_file(Grasshopper, gh_path))
        except Exception:
            log("ERRO em {}:\n{}".format(gh_path, traceback.format_exc()))
    write_dataset(all_rows)
    log("Dataset salvo em {}".format(DATASET_PATH))
    log("Total de modelos exportados: {}".format(len(all_rows)))


main()
