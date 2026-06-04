# Rhino 7 IronPython script.
# Imports the STL files listed in the canonical slicer dataset, arranges them
# in a validation grid, labels each sample, and saves a Rhino .3dm file.

import csv
import datetime
import math
import os
import traceback

import Rhino
import rhinoscriptsyntax as rs
import scriptcontext as sc
import System


REPO_ROOT = os.environ.get("TRACO_BASE_REPO", r"C:\Users\Administrador\Desktop\SCRIPTS\site-sapatas")
DATASET_PATH = os.path.join(REPO_ROOT, "Produtos", "datasets", "slicer_pricing_dataset.csv")
OUTPUT_DIR = os.path.join(REPO_ROOT, "Produtos", "validation")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "slice-export-grid.3dm")
LOG_DIR = os.path.join(REPO_ROOT, "Produtos", "logs")
LOG_PATH = os.path.join(LOG_DIR, "rhino_stl_grid.log")
GRID_COLUMNS = int(os.environ.get("RHINO_STL_GRID_COLUMNS", "15"))
CELL_PADDING = float(os.environ.get("RHINO_STL_GRID_PADDING", "70"))
LABEL_OFFSET_Y = float(os.environ.get("RHINO_STL_GRID_LABEL_OFFSET_Y", "86"))


LAYER_COLORS = {
    "ponteira-interna-tubo": System.Drawing.Color.FromArgb(67, 116, 145),
    "sapata-base-lisa": System.Drawing.Color.FromArgb(112, 134, 88),
    "labels": System.Drawing.Color.FromArgb(35, 35, 35),
    "grid": System.Drawing.Color.FromArgb(210, 215, 212),
}


def log(message):
    if not os.path.isdir(LOG_DIR):
        os.makedirs(LOG_DIR)
    line = "[{}] {}".format(datetime.datetime.now().isoformat(), message)
    print(line)
    with open(LOG_PATH, "a") as handle:
        handle.write(line + "\n")


def ensure_dirs():
    for folder in [OUTPUT_DIR, LOG_DIR]:
        if not os.path.isdir(folder):
            os.makedirs(folder)


def clear_doc():
    sc.doc = Rhino.RhinoDoc.ActiveDoc
    object_ids = [obj.Id for obj in sc.doc.Objects]
    for object_id in object_ids:
        sc.doc.Objects.Delete(object_id, True)
    sc.doc.Views.Redraw()


def read_rows():
    rows = []
    with open(DATASET_PATH, "r") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row.get("stl_file"):
                rows.append(row)
    return rows


def row_float(row, key):
    try:
        return float(row.get(key) or 0)
    except:
        return 0.0


def calculate_cell_size(rows):
    max_span = 0.0
    for row in rows:
        max_span = max(max_span, row_float(row, "bbox_x"), row_float(row, "bbox_y"))
    return max(180.0, max_span + CELL_PADDING)


def make_layer(name, color):
    if not rs.IsLayer(name):
        rs.AddLayer(name, color)
    return name


def layer_for_row(row):
    family = row.get("category_slug") or "produto"
    format_slug = row.get("format_slug") or "formato"
    variant = row.get("variant_slug") or "variante"
    layer_name = "grid_{}_{}_{}".format(family, format_slug, variant)
    return make_layer(layer_name, LAYER_COLORS.get(family, System.Drawing.Color.FromArgb(120, 120, 120)))


def repo_path(relative_path):
    return os.path.join(REPO_ROOT, relative_path.replace("/", os.sep).replace("\\", os.sep))


def import_stl(stl_path):
    before = set([obj.Id for obj in sc.doc.Objects])
    command = '-_Import "{}" _Enter'.format(stl_path)
    ok = Rhino.RhinoApp.RunScript(command, False)
    after = set([obj.Id for obj in sc.doc.Objects])
    imported = list(after - before)
    if not ok or not imported:
        return []
    return imported


def object_bbox(object_ids):
    points = rs.BoundingBox(object_ids)
    if not points:
        return None
    min_x = min([point.X for point in points])
    max_x = max([point.X for point in points])
    min_y = min([point.Y for point in points])
    max_y = max([point.Y for point in points])
    min_z = min([point.Z for point in points])
    max_z = max([point.Z for point in points])
    return {
        "min_x": min_x,
        "max_x": max_x,
        "min_y": min_y,
        "max_y": max_y,
        "min_z": min_z,
        "max_z": max_z,
        "center_x": (min_x + max_x) / 2.0,
        "center_y": (min_y + max_y) / 2.0,
    }


def move_to_cell(object_ids, row_index, cell_size):
    column = row_index % GRID_COLUMNS
    row = int(math.floor(row_index / float(GRID_COLUMNS)))
    target_x = column * cell_size
    target_y = -row * cell_size
    bbox = object_bbox(object_ids)
    if not bbox:
        return target_x, target_y
    move_vector = (
        target_x - bbox["center_x"],
        target_y - bbox["center_y"],
        -bbox["min_z"],
    )
    rs.MoveObjects(object_ids, move_vector)
    return target_x, target_y


def add_cell_frame(target_x, target_y, cell_size):
    half = cell_size / 2.0
    points = [
        (target_x - half, target_y - half, 0),
        (target_x + half, target_y - half, 0),
        (target_x + half, target_y + half, 0),
        (target_x - half, target_y + half, 0),
        (target_x - half, target_y - half, 0),
    ]
    frame = rs.AddPolyline(points)
    if frame:
        rs.ObjectLayer(frame, "grid")
    return frame


def params_label(row):
    parts = []
    for key in ["diametro", "diametroBase", "tamanhoBaseX", "tamanhoBaseY", "alturaBase", "alturaPescoco", "diametroPescoco", "paredeTubo"]:
        value = row.get(key)
        if value:
            parts.append("{}={}".format(key, value))
    return " | ".join(parts)


def add_label(row, target_x, target_y):
    label = "{}\n{} / {} / {}\n{}\n{} g / {} min".format(
        row.get("sample_id", ""),
        row.get("category_slug", ""),
        row.get("format_slug", ""),
        row.get("variant_slug", ""),
        params_label(row),
        row.get("material_grams", ""),
        row.get("print_minutes", ""),
    )
    dot = rs.AddTextDot(label, (target_x, target_y - LABEL_OFFSET_Y, 0))
    if dot:
        rs.ObjectLayer(dot, "labels")
    return dot


def save_file():
    options = Rhino.FileIO.FileWriteOptions()
    options.SuppressDialogBoxes = True
    Rhino.RhinoDoc.ActiveDoc.WriteFile(OUTPUT_PATH, options)


def main():
    ensure_dirs()
    if os.path.isfile(LOG_PATH):
        os.remove(LOG_PATH)
    rows = read_rows()
    log("Linhas lidas do dataset: {}".format(len(rows)))
    clear_doc()
    sc.doc.ModelUnitSystem = Rhino.UnitSystem.Millimeters
    make_layer("labels", LAYER_COLORS["labels"])
    make_layer("grid", LAYER_COLORS["grid"])
    cell_size = calculate_cell_size(rows)
    imported_count = 0
    failed = []

    for index, row in enumerate(rows):
        stl_path = repo_path(row.get("stl_file", ""))
        sample_id = row.get("sample_id", "linha_{}".format(index + 1))
        if not os.path.isfile(stl_path):
            failed.append((sample_id, "STL nao encontrado: {}".format(stl_path)))
            log("Falha {}: STL nao encontrado".format(sample_id))
            continue

        object_ids = import_stl(stl_path)
        if not object_ids:
            failed.append((sample_id, "Importacao vazia"))
            log("Falha {}: importacao vazia".format(sample_id))
            continue

        layer = layer_for_row(row)
        for object_id in object_ids:
            rs.ObjectLayer(object_id, layer)
            rs.ObjectName(object_id, sample_id)

        target_x, target_y = move_to_cell(object_ids, index, cell_size)
        add_cell_frame(target_x, target_y, cell_size)
        add_label(row, target_x, target_y)
        imported_count += 1
        if imported_count % 25 == 0:
            log("Importados {} de {}".format(imported_count, len(rows)))

    save_file()
    sc.doc.Views.Redraw()
    log("Arquivo salvo em {}".format(OUTPUT_PATH))
    log("STLs importados: {}".format(imported_count))
    log("Falhas: {}".format(len(failed)))
    for sample_id, message in failed:
        log("{}: {}".format(sample_id, message))


try:
    main()
except Exception:
    log("ERRO:\n{}".format(traceback.format_exc()))
    raise
