# Rhino 7 IronPython script.
# Opens Grasshopper definitions, generates product parameter variations, exports final
# solids to 3MF/STL, and writes the canonical slicer pricing dataset.

import csv
import datetime
import os
import re
import traceback
import unicodedata

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
DATASET_PATH = os.path.join(DATASET_DIR, "slicer_pricing_dataset.csv")
LOG_PATH = os.path.join(LOG_DIR, "slicer_pricing_dataset.log")
VARIATIONS_PER_FILE_OVERRIDE = os.environ.get("GH_VARIATIONS_PER_FILE")
TARGET_VALID_PER_FILE_OVERRIDE = os.environ.get("GH_TARGET_VALID_PER_FILE")
MAX_VARIATION_ATTEMPTS_OVERRIDE = os.environ.get("GH_MAX_VARIATION_ATTEMPTS")
SAMPLE_OFFSET = int(os.environ.get("GH_SAMPLE_OFFSET", "0"))
ONLY_FILTER = os.environ.get("GH_ONLY", "").lower()
APPEND_DATASET = os.environ.get("GH_APPEND_DATASET", "false").lower() == "true"
REPLACE_EXISTING = os.environ.get("GH_REPLACE_EXISTING", "false").lower() == "true"

DEFAULT_SAMPLE_COUNTS_BY_PARAMETER_COUNT = {
    0: 1,
    1: 40,
    2: 80,
    3: 120,
    4: 200,
    5: 240,
}

PARAMETER_COLUMNS = [
    "diametro",
    "diametroBase",
    "tamanhoBaseX",
    "tamanhoBaseY",
    "alturaBase",
    "alturaPescoco",
    "diametroPescoco",
    "paredeTubo",
    "pescoco",
]

SLICE_COLUMNS = [
    "gcode_file",
    "material_grams",
    "print_minutes",
    "filament_mm",
    "orca_version",
    "profile_id",
    "printer_id",
    "material_id",
    "nozzle_temp_c",
    "bed_temp_c",
    "sliced_at",
    "parser",
    "slice_status",
    "slice_error",
]

CANONICAL_HEADERS = [
    "source_gh",
    "sample_id",
    "variation_index",
    "product_family",
    "category_slug",
    "format_slug",
    "variant_slug",
    "has_neck",
    "sample_strategy",
    "export_selection",
    "slider_values",
    "model_file",
    "stl_file",
] + PARAMETER_COLUMNS + [
    "object_type",
    "area_model_units2",
    "volume_model_units3",
    "bbox_x",
    "bbox_y",
    "bbox_z",
] + SLICE_COLUMNS


def parameter(minimum, maximum, default_value, step=1):
    return {
        "min": float(minimum),
        "max": float(maximum),
        "default": float(default_value),
        "step": float(step),
    }


PRODUCT_CONFIGS = [
    {
        "source_gh": "Produtos/Scripts-GH/Sapata_Interna_Tubo-Redondo.gh",
        "product_family": "ponteira-interna-tubo",
        "category_slug": "ponteira-interna-tubo",
        "format_slug": "redondo",
        "variant_slug": "sem-haste",
        "has_neck": False,
        "slider_order": ["diametroBase", "alturaBase", "alturaPescoco", "paredeTubo"],
        "generic_slider_order": [],
        "grasshopper_slider_transforms": {
            "diametroBase": {
                "offset": 10,
            },
        },
        "parameters": {
            "diametroBase": parameter(3, 150, 28),
            "alturaBase": parameter(1, 10, 6),
            "alturaPescoco": parameter(5, 35, 18),
            "paredeTubo": parameter(0.8, 8, 1.5, 0.1),
        },
    },
    {
        "source_gh": "Produtos/Scripts-GH/Sapata_Interna_Tubo-Quadrado.gh",
        "product_family": "ponteira-interna-tubo",
        "category_slug": "ponteira-interna-tubo",
        "format_slug": "quadrado",
        "variant_slug": "sem-haste",
        "has_neck": False,
        "slider_order": ["tamanhoBaseX", "tamanhoBaseY", "alturaBase", "alturaPescoco", "paredeTubo"],
        "generic_slider_order": ["tamanhoBaseX", "tamanhoBaseY"],
        "sample_strategy": "dense_xy_axis_ranges",
        "sampling": {
            "mode": "dense_xy_axis",
            "xy_keys": ["tamanhoBaseX", "tamanhoBaseY"],
            "xy_low_max": 30,
            "xy_coarse_step": 5,
            "random_count": 240,
        },
        "parameters": {
            "tamanhoBaseX": parameter(3, 150, 30),
            "tamanhoBaseY": parameter(3, 150, 30),
            "alturaBase": parameter(1, 10, 6),
            "alturaPescoco": parameter(5, 35, 20),
            "paredeTubo": parameter(0.8, 8, 1.5, 0.1),
        },
    },
    {
        "source_gh": "Produtos/Scripts-GH/Sapata_Interna_Tubo-Oblongo.gh",
        "product_family": "ponteira-interna-tubo",
        "category_slug": "ponteira-interna-tubo",
        "format_slug": "oblongo",
        "variant_slug": "sem-haste",
        "has_neck": False,
        "slider_order": ["tamanhoBaseX", "tamanhoBaseY", "alturaBase", "alturaPescoco", "paredeTubo"],
        "generic_slider_order": ["tamanhoBaseX", "tamanhoBaseY", "paredeTubo", "alturaBase", "alturaPescoco"],
        "parameters": {
            "tamanhoBaseX": parameter(3, 150, 36),
            "tamanhoBaseY": parameter(3, 150, 18),
            "alturaBase": parameter(1, 10, 6),
            "alturaPescoco": parameter(5, 35, 18),
            "paredeTubo": parameter(0.8, 8, 1.5, 0.1),
        },
    },
    {
        "source_gh": "Produtos/Scripts-GH/Sapata_Lisa_Redonda.gh",
        "product_family": "sapata-base-lisa",
        "category_slug": "sapata-base-lisa",
        "format_slug": "redonda",
        "variant_slug": "sem-haste",
        "has_neck": False,
        "slider_order": ["diametro", "alturaBase"],
        "parameters": {
            "diametro": parameter(3, 150, 28),
            "alturaBase": parameter(1, 10, 6),
        },
    },
    {
        "source_gh": "Produtos/Scripts-GH/Sapata_Lisa_Redonda-com Haste.gh",
        "product_family": "sapata-base-lisa",
        "category_slug": "sapata-base-lisa",
        "format_slug": "redonda",
        "variant_slug": "haste",
        "has_neck": True,
        "slider_order": ["diametro", "alturaBase", "alturaPescoco", "diametroPescoco"],
        "sample_strategy": "product_axis_forced_neck_height_ranges",
        "sampling": {
            "force_axis_keys": ["alturaPescoco"],
            "target_count": 400,
        },
        "parameters": {
            "diametro": parameter(3, 150, 28),
            "alturaBase": parameter(1, 10, 6),
            "alturaPescoco": parameter(5, 35, 12),
            "diametroPescoco": parameter(3, 15, 8),
        },
    },
    {
        "source_gh": "Produtos/Scripts-GH/Sapata_Lisa_Redonda-com parafuso.gh",
        "product_family": "sapata-base-lisa",
        "category_slug": "sapata-base-lisa",
        "format_slug": "redonda",
        "variant_slug": "com-parafuso",
        "has_neck": False,
        "slider_order": ["diametro", "alturaBase"],
        "parameters": {
            "diametro": parameter(3, 150, 28),
            "alturaBase": parameter(1, 10, 6),
        },
    },
    {
        "source_gh": "Produtos/Scripts-GH/Sapata_Lisa_Quadrada.gh",
        "product_family": "sapata-base-lisa",
        "category_slug": "sapata-base-lisa",
        "format_slug": "quadrada",
        "variant_slug": "sem-haste",
        "has_neck": False,
        "slider_order": ["tamanhoBaseX", "tamanhoBaseY", "alturaBase"],
        "parameters": {
            "tamanhoBaseX": parameter(3, 150, 50),
            "tamanhoBaseY": parameter(3, 150, 50),
            "alturaBase": parameter(1, 10, 7),
        },
    },
    {
        "source_gh": "Produtos/Scripts-GH/Sapata_Lisa_Quadrada-com haste.gh",
        "product_family": "sapata-base-lisa",
        "category_slug": "sapata-base-lisa",
        "format_slug": "quadrada",
        "variant_slug": "haste",
        "has_neck": True,
        "slider_order": ["tamanhoBaseX", "tamanhoBaseY", "alturaBase", "alturaPescoco", "diametroPescoco"],
        "sample_strategy": "product_axis_forced_neck_height_ranges",
        "sampling": {
            "force_axis_keys": ["alturaPescoco"],
            "target_count": 480,
        },
        "parameters": {
            "tamanhoBaseX": parameter(3, 150, 50),
            "tamanhoBaseY": parameter(3, 150, 50),
            "alturaBase": parameter(1, 10, 7),
            "alturaPescoco": parameter(5, 35, 12),
            "diametroPescoco": parameter(3, 15, 8),
        },
    },
    {
        "source_gh": "Produtos/Scripts-GH/Sapata_Lisa_Quadrada-com parafuso.gh",
        "product_family": "sapata-base-lisa",
        "category_slug": "sapata-base-lisa",
        "format_slug": "quadrada",
        "variant_slug": "com-parafuso",
        "has_neck": False,
        "slider_order": ["tamanhoBaseX", "tamanhoBaseY", "alturaBase"],
        "parameters": {
            "tamanhoBaseX": parameter(3, 150, 50),
            "tamanhoBaseY": parameter(3, 150, 50),
            "alturaBase": parameter(1, 10, 7),
        },
    },
]


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


def normalized_repo_path(path_value):
    return (path_value or "").replace("\\", "/").lower()


def product_config_for_path(gh_path):
    relative = normalized_repo_path(os.path.relpath(gh_path, REPO_ROOT))
    for config in PRODUCT_CONFIGS:
        if normalized_repo_path(config.get("source_gh")) == relative:
            return config
    return None


def parameter_config(product_config, key):
    if not product_config:
        return None
    return product_config.get("parameters", {}).get(key)


def configured_parameter_count(product_config, sliders):
    if product_config:
        return len(product_config.get("parameters", {}))
    return len(sliders or [])


def default_sample_count(parameter_count):
    if parameter_count in DEFAULT_SAMPLE_COUNTS_BY_PARAMETER_COUNT:
        return DEFAULT_SAMPLE_COUNTS_BY_PARAMETER_COUNT[parameter_count]
    return 240


def target_valid_count(product_config, sliders):
    if TARGET_VALID_PER_FILE_OVERRIDE:
        return int(TARGET_VALID_PER_FILE_OVERRIDE)
    if VARIATIONS_PER_FILE_OVERRIDE:
        return int(VARIATIONS_PER_FILE_OVERRIDE)
    return default_sample_count(configured_parameter_count(product_config, sliders))


def max_attempt_count(target_valid):
    if MAX_VARIATION_ATTEMPTS_OVERRIDE:
        return int(MAX_VARIATION_ATTEMPTS_OVERRIDE)
    return max(target_valid * 3, target_valid + 40)


def parameter_range_values(param):
    minimum = float(param.get("min", 0))
    maximum = float(param.get("max", minimum))
    step = float(param.get("step", 1))
    decimals = slider_decimals(None, param)
    values = []
    current = minimum
    guard = 0
    while current <= maximum + 0.000001 and guard < 10000:
        values.append(round_input_number(round(current, decimals)))
        current += step
        guard += 1
    return unique_numbers(values)


def dense_dimension_values(param, low_max, coarse_step):
    minimum = float(param.get("min", 0))
    maximum = float(param.get("max", minimum))
    step = float(param.get("step", 1))
    decimals = slider_decimals(None, param)
    values = []

    current = minimum
    while current <= min(maximum, float(low_max)) + 0.000001:
        values.append(round_input_number(round(current, decimals)))
        current += step

    current = max(minimum, float(low_max) + float(coarse_step))
    while current <= maximum + 0.000001:
        values.append(round_input_number(round(current, decimals)))
        current += float(coarse_step)

    values.extend([minimum, maximum, param.get("default", minimum)])
    return unique_numbers(values)


def unique_numbers(values):
    result = []
    seen = set()
    for value in values:
        normalized = format_input_value(value)
        if normalized in seen:
            continue
        seen.add(normalized)
        result.append(round_input_number(value))
    return result


def default_parameter_values(product_config):
    values = {}
    if not product_config:
        return values
    for key, param in product_config.get("parameters", {}).items():
        values[key] = round_input_number(round(float(param.get("default", 0)), slider_decimals(None, param)))
    return values


def add_planned_variation(plan, seen, values):
    signature = public_parameter_signature_from_values(values)
    if signature in seen:
        return
    seen.add(signature)
    plan.append(dict(values))


def product_variation_plan(product_config):
    if not product_config:
        return []

    sampling = product_config.get("sampling", {})
    force_axis_keys = sampling.get("force_axis_keys", []) or []
    if sampling.get("mode") != "dense_xy_axis" and not force_axis_keys:
        return []

    parameters = product_config.get("parameters", {})
    defaults = default_parameter_values(product_config)
    plan = []
    seen = set()
    add_planned_variation(plan, seen, defaults)

    dense_mode = sampling.get("mode") == "dense_xy_axis"

    if dense_mode:
        for key, param in parameters.items():
            for value in parameter_range_values(param):
                values = dict(defaults)
                values[key] = value
                add_planned_variation(plan, seen, values)

    for key in force_axis_keys:
        param = parameters.get(key)
        if not param:
            continue
        for value in parameter_range_values(param):
            values = dict(defaults)
            values[key] = value
            add_planned_variation(plan, seen, values)

    xy_keys = sampling.get("xy_keys", [])
    if len(xy_keys) == 2 and xy_keys[0] in parameters and xy_keys[1] in parameters:
        x_values = dense_dimension_values(
            parameters[xy_keys[0]],
            sampling.get("xy_low_max", parameters[xy_keys[0]].get("default", 30)),
            sampling.get("xy_coarse_step", 5),
        )
        y_values = dense_dimension_values(
            parameters[xy_keys[1]],
            sampling.get("xy_low_max", parameters[xy_keys[1]].get("default", 30)),
            sampling.get("xy_coarse_step", 5),
        )
        for x_value in x_values:
            for y_value in y_values:
                values = dict(defaults)
                values[xy_keys[0]] = x_value
                values[xy_keys[1]] = y_value
                add_planned_variation(plan, seen, values)

    if dense_mode:
        random_count = int(sampling.get("random_count", 0))
        random_total = max(1, random_count + 3)
        random_offset = 3
        target_count = None
    else:
        target_count = int(sampling.get("target_count", default_sample_count(len(parameters))))
        random_count = int(sampling.get("random_count", max_attempt_count(target_count)))
        random_total = max_attempt_count(target_count)
        random_offset = 0

    for index in range(random_count):
        if target_count is not None and len(plan) >= target_count:
            break
        values = dict(defaults)
        for slider_index, key in enumerate(product_config.get("slider_order", [])):
            param = parameters.get(key)
            if not param:
                continue
            values[key] = variation_value(
                index + random_offset,
                slider_index,
                random_total,
                float(param.get("min", 0)),
                float(param.get("max", 0)),
                float(param.get("default", 0)),
                slider_decimals(None, param),
                len(parameters),
            )
        add_planned_variation(plan, seen, values)

    return plan


def is_generic_slider_name(value):
    text = (value or "").strip().lower()
    return text in ["", "number slider", "slider", "gh_number slider"] or text.startswith("slider_")


def canonical_text(value):
    try:
        text = unicode(value or "")
    except:
        text = str(value or "")
    try:
        text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    except:
        pass
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def aliased_slider_name(raw_name, product_config):
    if not product_config:
        return ""

    public_parameters = product_config.get("parameters", {})
    key = canonical_text(raw_name)

    if key == "diametro":
        if "diametroBase" in public_parameters:
            return "diametroBase"
        if "diametro" in public_parameters:
            return "diametro"

    aliases = {
        "paredetubo": "paredeTubo",
        "alturabase": "alturaBase",
        "alturapescoco": "alturaPescoco",
        "diametrohaste": "diametroPescoco",
        "alturahaste": "alturaPescoco",
        "x": "tamanhoBaseX",
        "y": "tamanhoBaseY",
    }
    alias = aliases.get(key, "")
    if alias in public_parameters:
        return alias
    return ""


def slider_export_name(slider, index, product_config):
    raw_name = slider.NickName or slider.Name or ""
    order = product_config.get("generic_slider_order", []) if product_config else []
    alias = aliased_slider_name(raw_name, product_config)

    if alias:
        return alias

    if product_config and index < len(order):
        if is_generic_slider_name(raw_name):
            return order[index]

    return raw_name or "slider_{}".format(index + 1)


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
    sliders.sort(key=slider_sort_key)
    return sliders


def slider_sort_key(slider):
    try:
        pivot = slider.Attributes.Pivot
        return (round(float(pivot.Y), 3), round(float(pivot.X), 3), str(slider.InstanceGuid))
    except:
        return (slider.NickName or slider.Name or "", str(slider.InstanceGuid))


def slider_min(slider, param=None):
    if param and "min" in param:
        return float(param.get("min"))
    try:
        return float(slider.Slider.Minimum)
    except:
        return 0.0


def slider_max(slider, param=None):
    if param and "max" in param:
        return float(param.get("max"))
    try:
        return float(slider.Slider.Maximum)
    except:
        return 1.0


def slider_default(slider, param=None):
    if param and "default" in param:
        return float(param.get("default"))
    try:
        return float(slider.Slider.Value)
    except:
        return slider_min(slider, param)


def slider_decimals(slider, param=None):
    if param and "step" in param:
        step_text = str(param.get("step"))
        if "." in step_text:
            return len(step_text.split(".")[1].rstrip("0"))
        return 0
    try:
        return int(slider.Slider.DecimalPlaces)
    except:
        return 0


def set_slider(slider, value, decimals):
    rounded = round(float(value), decimals)
    try:
        slider.SetSliderValue(System.Decimal(rounded))
    except:
        try:
            slider.Slider.Value = System.Decimal(rounded)
        except:
            log("Nao foi possivel definir slider {} = {}".format(slider.NickName, rounded))


def configure_slider_for_parameter(slider, param, decimals):
    if not param:
        return
    try:
        slider.Slider.Minimum = System.Decimal(float(param.get("min")))
        slider.Slider.Maximum = System.Decimal(float(param.get("max")))
    except:
        pass
    try:
        slider.Slider.DecimalPlaces = int(decimals)
    except:
        pass


def grasshopper_slider_transform(product_config, key):
    if not product_config:
        return {}
    return product_config.get("grasshopper_slider_transforms", {}).get(key, {})


def grasshopper_value_from_public(product_config, key, value):
    transform = grasshopper_slider_transform(product_config, key)
    scale = float(transform.get("scale", 1))
    offset = float(transform.get("offset", 0))
    return float(value) * scale + offset


def transformed_parameter(product_config, key, param):
    if not param:
        return None
    transformed = dict(param)
    transformed["min"] = grasshopper_value_from_public(product_config, key, param.get("min", 0))
    transformed["max"] = grasshopper_value_from_public(product_config, key, param.get("max", 0))
    transformed["default"] = grasshopper_value_from_public(product_config, key, param.get("default", 0))
    return transformed


def log_slider_inventory(sliders, product_config):
    for index, slider in enumerate(sliders):
        raw_name = slider.NickName or slider.Name or ""
        mapped_name = slider_export_name(slider, index, product_config)
        try:
            pivot = slider.Attributes.Pivot
            pivot_text = "{:.1f},{:.1f}".format(float(pivot.X), float(pivot.Y))
        except:
            pivot_text = ""
        log(
            "Slider {}: raw='{}' mapped='{}' min={} max={} default={} decimals={} pivot={}".format(
                index + 1,
                raw_name,
                mapped_name,
                format_input_value(slider_min(slider)),
                format_input_value(slider_max(slider)),
                format_input_value(slider_default(slider)),
                slider_decimals(slider),
                pivot_text,
            )
        )


def variation_value(index, slider_index, total, minimum, maximum, default_value, decimals, public_parameter_count=0):
    if maximum <= minimum:
        return round_input_number(minimum)
    if index == 0:
        return round_input_number(round(default_value, decimals))
    if index == 1:
        return round_input_number(round(minimum, decimals))
    if index == 2:
        return round_input_number(round(maximum, decimals))

    local_index = index - 3
    public_count = max(1, int(public_parameter_count or 0))
    axis_steps = max(5, min(17, int((max(1, total - 3)) / max(1, public_count * 2))))
    axis_total = axis_steps * public_count

    if slider_index < public_count and local_index < axis_total:
        axis_index = int(local_index / axis_steps)
        axis_step = local_index % axis_steps
        if slider_index == axis_index:
            ratio = axis_step / float(max(1, axis_steps - 1))
            value = minimum + (maximum - minimum) * ratio
            return round_input_number(round(value, decimals))
        return round_input_number(round(default_value, decimals))

    fill_index = max(0, local_index - axis_total)
    seed = (0.618033988749895 + (slider_index + 1) * 0.137507764050037)
    ratio = ((fill_index + 1) * seed + slider_index * 0.2718281828459045) % 1.0
    value = minimum + (maximum - minimum) * ratio
    return round_input_number(round(value, decimals))


def apply_variation(sliders, index, total, product_config=None, planned_values=None):
    values = {}
    public_parameters = product_config.get("parameters", {}) if product_config else {}
    public_parameter_count = len(public_parameters)

    if product_config:
        for key, param in public_parameters.items():
            values[key] = round_input_number(round(float(param.get("default", 0)), slider_decimals(None, param)))

    public_slider_index = 0

    for slider_index, slider in enumerate(sliders):
        name = slider_export_name(slider, slider_index, product_config)
        param = parameter_config(product_config, name)
        slider_param = transformed_parameter(product_config, name, param)
        default_value = slider_default(slider, param)
        decimals = slider_decimals(slider, param)

        if product_config and name not in public_parameters:
            next_value = round_input_number(round(default_value, decimals))
            set_slider(slider, next_value, decimals)
            values[name] = round_input_number(next_value)
            continue

        minimum = slider_min(slider, param)
        maximum = slider_max(slider, param)
        configure_slider_for_parameter(slider, slider_param, decimals)
        if planned_values and name in planned_values:
            next_value = round_input_number(round(float(planned_values.get(name)), decimals))
        else:
            next_value = variation_value(
                index,
                public_slider_index,
                total,
                minimum,
                maximum,
                default_value,
                decimals,
                public_parameter_count,
            )
        slider_next_value = round_input_number(round(grasshopper_value_from_public(product_config, name, next_value), decimals))
        set_slider(slider, slider_next_value, decimals)
        values[name] = round_input_number(next_value)
        public_slider_index += 1

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


def gh_object_sort_key(obj):
    try:
        pivot = obj.Attributes.Pivot
        return (round(float(pivot.X), 3), round(float(pivot.Y), 3), str(obj.InstanceGuid))
    except:
        return (0.0, 0.0, str(obj.InstanceGuid))


def gh_object_label(obj):
    for attr_name in ["NickName", "Name"]:
        try:
            value = getattr(obj, attr_name)
            if value:
                return value
        except:
            pass
    try:
        return obj.GetType().Name
    except:
        return "GrasshopperComponent"


def gh_object_type_name(obj):
    try:
        return obj.GetType().Name
    except:
        return ""


def component_has_output_named(obj, expected_name):
    try:
        outputs = obj.Params.Output
    except:
        outputs = []
    for output in outputs:
        try:
            output_name = output.NickName or output.Name or ""
        except:
            output_name = ""
        if output_name.strip().upper() == expected_name.strip().upper():
            return True
    return False


def is_solid_union_component(obj):
    names = [gh_object_label(obj), gh_object_type_name(obj)]
    for name in names:
        normalized = (name or "").strip().lower()
        if normalized == "sunion" or "solid union" in normalized:
            return True
    return False


def output_geometries(obj, only_export_output=False):
    geometries = []
    seen = set()
    try:
        outputs = obj.Params.Output
    except:
        outputs = []
    for output in outputs:
        output_name = ""
        try:
            output_name = output.NickName or output.Name or ""
        except:
            output_name = ""
        is_export_output = output_name.strip().upper() == "EXPORT_3MF"
        if only_export_output and not is_export_output:
            continue
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
                geometries.append(geom)
    return geometries


def select_export_component(ghdoc):
    export_candidates = []
    final_candidates = []

    for obj in ghdoc.Objects:
        if component_has_output_named(obj, "EXPORT_3MF"):
            export_candidates.append({
                "sort_key": gh_object_sort_key(obj),
                "label": gh_object_label(obj),
                "component": obj,
                "only_export_output": True,
            })
            continue

        try:
            has_outputs = len(obj.Params.Output) > 0
        except:
            has_outputs = False
        if not has_outputs:
            continue

        candidate = {
            "sort_key": gh_object_sort_key(obj),
            "label": gh_object_label(obj),
            "component": obj,
            "only_export_output": False,
        }

        if output_geometries(obj, False):
            final_candidates.append(candidate)

    if export_candidates:
        chosen = sorted(export_candidates, key=lambda item: item["sort_key"])[-1]
        return chosen["component"], "export_3mf:{}".format(chosen["label"]), chosen["only_export_output"]

    if final_candidates:
        chosen = sorted(final_candidates, key=lambda item: item["sort_key"])[-1]
        return chosen["component"], "final_canvas_component:{}".format(chosen["label"]), chosen["only_export_output"]

    return None, "no_exportable_final_component", False


def collect_geometries(component, only_export_output=False):
    if component is None:
        return []
    return output_geometries(component, only_export_output)


def clean_generated_outputs():
    if APPEND_DATASET:
        return
    for folder, extension in [(OUT_DIR, ".3mf"), (STL_DIR, ".stl")]:
        if not os.path.isdir(folder):
            continue
        for name in os.listdir(folder):
            if not name.lower().endswith(extension):
                continue
            path = os.path.join(folder, name)
            try:
                os.remove(path)
            except Exception as exc:
                log("Nao foi possivel remover arquivo antigo {}: {}".format(path, exc))


def final_export_geometry(geometries, selection_source, sample_id):
    if len(geometries) == 1:
        return geometries[0]

    breps = []
    for geom in geometries:
        if isinstance(geom, Rhino.Geometry.Brep):
            breps.append(geom)
        elif isinstance(geom, Rhino.Geometry.Extrusion):
            breps.append(geom.ToBrep())

    if len(breps) > 1:
        try:
            joined = Rhino.Geometry.Brep.CreateBooleanUnion(breps, Rhino.RhinoDoc.ActiveDoc.ModelAbsoluteTolerance)
        except:
            joined = None
        if joined and len(joined) == 1 and is_exportable_solid(joined[0]):
            log("Uniao local aplicada em {} a partir de {} solidos do {}".format(sample_id, len(geometries), selection_source))
            return joined[0]

    log("Output descartado: {} retornou {} solidos nao univeis em {}".format(selection_source, len(geometries), sample_id))
    return None


def numeric_slider_value(slider_values, key, default_value=0):
    try:
        return float(slider_values.get(key, default_value))
    except:
        return float(default_value)


def add_base_shoe_neck_if_missing(geom, product_config, slider_values, sample_id):
    if not product_config or not product_config.get("has_neck", False):
        return geom
    if product_config.get("category_slug", "") != "sapata-base-lisa":
        return geom

    base_height = numeric_slider_value(slider_values, "alturaBase", 0)
    neck_height = numeric_slider_value(slider_values, "alturaPescoco", 0)
    neck_diameter = numeric_slider_value(slider_values, "diametroPescoco", 0)
    if base_height <= 0 or neck_height <= 0 or neck_diameter <= 0:
        return geom

    if isinstance(geom, Rhino.Geometry.Extrusion):
        geom = geom.ToBrep()
    if not isinstance(geom, Rhino.Geometry.Brep):
        return geom

    bbox = geom.GetBoundingBox(True)
    current_height = bbox.Max.Z - bbox.Min.Z
    expected_height = base_height + neck_height
    if current_height >= expected_height - 0.1:
        return geom

    center = Rhino.Geometry.Point3d(
        (bbox.Min.X + bbox.Max.X) / 2.0,
        (bbox.Min.Y + bbox.Max.Y) / 2.0,
        bbox.Max.Z - 0.02,
    )
    plane = Rhino.Geometry.Plane(center, Rhino.Geometry.Vector3d.ZAxis)
    circle = Rhino.Geometry.Circle(plane, neck_diameter / 2.0)
    cylinder = Rhino.Geometry.Cylinder(circle, neck_height + 0.02)
    neck = cylinder.ToBrep(True, True)
    if not neck or not neck.IsSolid:
        log("AVISO: haste sintetica invalida em {}".format(sample_id))
        return geom

    joined = None
    try:
        joined = Rhino.Geometry.Brep.CreateBooleanUnion(
            [geom, neck],
            Rhino.RhinoDoc.ActiveDoc.ModelAbsoluteTolerance
        )
    except:
        joined = None

    if joined and len(joined) == 1 and is_exportable_solid(joined[0]):
        log("Haste sintetica aplicada em {}: {:.2f} x {:.2f} mm".format(sample_id, neck_diameter, neck_height))
        return joined[0]

    try:
        joined_breps = Rhino.Geometry.Brep.JoinBreps(
            [geom, neck],
            Rhino.RhinoDoc.ActiveDoc.ModelAbsoluteTolerance * 10
        )
    except:
        joined_breps = None

    if joined_breps and len(joined_breps) == 1 and is_exportable_solid(joined_breps[0]):
        log("Haste sintetica unida por join em {}: {:.2f} x {:.2f} mm".format(sample_id, neck_diameter, neck_height))
        return joined_breps[0]

    if product_config.get("format_slug", "") == "redonda":
        base_diameter = numeric_slider_value(slider_values, "diametro", neck_diameter)
        if abs(base_diameter - neck_diameter) > 0.1:
            log("AVISO: fallback cilindrico ignorado em {}; diametro base {:.2f}, haste {:.2f}".format(sample_id, base_diameter, neck_diameter))
            return geom
        radius = max(base_diameter, neck_diameter) / 2.0
        full_center = Rhino.Geometry.Point3d(
            (bbox.Min.X + bbox.Max.X) / 2.0,
            (bbox.Min.Y + bbox.Max.Y) / 2.0,
            bbox.Min.Z,
        )
        full_circle = Rhino.Geometry.Circle(
            Rhino.Geometry.Plane(full_center, Rhino.Geometry.Vector3d.ZAxis),
            radius
        )
        full_cylinder = Rhino.Geometry.Cylinder(full_circle, expected_height)
        full_geom = full_cylinder.ToBrep(True, True)
        if full_geom and is_exportable_solid(full_geom):
            log("Haste sintetica cilindrica aplicada em {}: {:.2f} x {:.2f} mm".format(sample_id, radius * 2.0, expected_height))
            return full_geom

    log("AVISO: falha ao unir haste sintetica em {}; mantendo solido original".format(sample_id))
    return geom


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


def bool_text(value):
    return "true" if bool(value) else "false"


def parameter_values(product_config, slider_values):
    row = {}
    for column in PARAMETER_COLUMNS:
        row[column] = ""

    for key, value in slider_values.items():
        if key in PARAMETER_COLUMNS:
            row[key] = format_input_value(value)

    if product_config:
        row["pescoco"] = bool_text(product_config.get("has_neck", False))

    return row


def round_input_number(value):
    try:
        return round(float(value), 2)
    except:
        return value


def format_input_value(value):
    if value is None or value == "":
        return ""
    try:
        return "{:.2f}".format(float(value))
    except:
        return str(value)


def format_slider_values(slider_values):
    parts = []
    for key in sorted(slider_values.keys()):
        parts.append("{}={}".format(key, format_input_value(slider_values.get(key))))
    return "; ".join(parts)


def value_matches(slider_values, key, expected):
    try:
        return abs(round(float(slider_values.get(key)), 2) - float(expected)) < 0.01
    except:
        return False


def slicer_unsafe_sample_reason(base_name, slider_values):
    if base_name == "Sapata_Interna_Tubo-Oblongo":
        if (
            value_matches(slider_values, "tamanhoBaseX", 109)
            and value_matches(slider_values, "tamanhoBaseY", 11)
            and value_matches(slider_values, "alturaBase", 5)
            and value_matches(slider_values, "alturaPescoco", 27)
            and value_matches(slider_values, "paredeTubo", 1.2)
        ):
            return "orca_exclude_triangles"
    if base_name == "Sapata_Interna_Tubo-Quadrado":
        if (
            value_matches(slider_values, "tamanhoBaseX", 48)
            and value_matches(slider_values, "tamanhoBaseY", 114)
            and value_matches(slider_values, "alturaBase", 3)
            and value_matches(slider_values, "alturaPescoco", 25)
            and value_matches(slider_values, "paredeTubo", 1.6)
        ):
            return "orca_exclude_triangles"
    if base_name == "Sapata_Interna_Tubo-Redondo":
        if (
            value_matches(slider_values, "diametroBase", 41)
            and value_matches(slider_values, "alturaBase", 7)
            and value_matches(slider_values, "alturaPescoco", 9)
            and value_matches(slider_values, "paredeTubo", 4.9)
        ):
            return "orca_exclude_triangles"
    if base_name in ["Sapata_Lisa_Redonda-com-parafuso", "Sapata_Lisa_Redonda-com parafuso"]:
        if (
            value_matches(slider_values, "diametro", 6)
            and value_matches(slider_values, "alturaBase", 9)
        ):
            return "empty_or_invalid_export_geometry"
    return ""


def public_parameter_signature(product_config, slider_values):
    if not product_config:
        return ""
    return public_parameter_signature_from_values(slider_values, product_config.get("parameters", {}).keys())


def public_parameter_signature_from_values(values, keys=None):
    parts = []
    source_keys = sorted(keys if keys is not None else values.keys())
    for key in source_keys:
        parts.append("{}={}".format(key, format_input_value(values.get(key))))
    return "|".join(parts)


def existing_dataset_rows():
    if not os.path.isfile(DATASET_PATH):
        return []
    rows = []
    try:
        with open(DATASET_PATH, "rb") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                rows.append(row)
    except Exception as exc:
        log("Nao foi possivel ler dataset existente para append: {}".format(exc))
    return rows


def existing_product_rows(product_config):
    if not APPEND_DATASET or REPLACE_EXISTING or not product_config:
        return []
    rows = existing_dataset_rows()
    return [
        row for row in rows
        if row.get("category_slug") == product_config.get("category_slug", "")
        and row.get("format_slug") == product_config.get("format_slug", "")
        and row.get("variant_slug") == product_config.get("variant_slug", "")
    ]


def existing_product_signatures(product_config):
    signatures = set()
    keys = product_config.get("parameters", {}).keys() if product_config else []
    for row in existing_product_rows(product_config):
        signatures.add(public_parameter_signature_from_values(row, keys))
    return signatures


def existing_sample_count_for_family(family_slug):
    if not APPEND_DATASET or REPLACE_EXISTING:
        return 0
    prefix = "{}__v".format(family_slug)
    count = 0
    for row in existing_dataset_rows():
        if (row.get("sample_id") or "").startswith(prefix):
            count += 1
    return count


def empty_slice_values():
    row = {}
    for column in SLICE_COLUMNS:
        row[column] = ""
    row["slice_status"] = "pending"
    return row


def process_file(Grasshopper, gh_path):
    rows = []
    base_name = os.path.splitext(os.path.basename(gh_path))[0]
    family_slug = slug(base_name)
    product_config = product_config_for_path(gh_path)
    log("Processando {}".format(os.path.basename(gh_path)))
    if product_config:
        log("Produto: {}:{}:{}".format(
            product_config.get("category_slug", ""),
            product_config.get("format_slug", ""),
            product_config.get("variant_slug", "")
        ))
    else:
        log("Sem configuracao de produto; parametros ficarao apenas em slider_values.")

    ghdoc = open_gh_document(Grasshopper, gh_path)
    sliders = get_number_sliders(ghdoc)
    log("{} sliders encontrados em {}".format(len(sliders), os.path.basename(gh_path)))
    log_slider_inventory(sliders, product_config)

    if len(sliders) == 0:
        log("Sem sliders numericos; gerando apenas a solucao padrao.")

    variation_plan = product_variation_plan(product_config)
    existing_signatures = existing_product_signatures(product_config)
    if variation_plan:
        plan_signatures = [
            public_parameter_signature(product_config, values)
            for values in variation_plan
        ]
        target_valid = len([signature for signature in plan_signatures if signature not in existing_signatures])
        max_attempts = len(variation_plan)
        log("Plano de amostragem denso: {} variacoes, {} novas no append".format(len(variation_plan), target_valid))
    else:
        target_valid = target_valid_count(product_config, sliders)
        max_attempts = max_attempt_count(target_valid)
    log("Amostras alvo: {} validas em ate {} tentativas".format(target_valid, max_attempts))

    solve(ghdoc)
    export_component, selection_source, only_export_output = select_export_component(ghdoc)
    log("Componente de exportacao escolhido: {}".format(selection_source))
    seen_parameter_signatures = set(existing_signatures)
    if existing_signatures:
        log("Assinaturas existentes no dataset: {}".format(len(existing_signatures)))
    sample_offset = SAMPLE_OFFSET
    if APPEND_DATASET and SAMPLE_OFFSET == 0:
        sample_offset = existing_sample_count_for_family(family_slug)

    for attempt_index in range(max_attempts):
        if len(rows) >= target_valid:
            break
        clear_doc()
        planned_values = variation_plan[attempt_index] if attempt_index < len(variation_plan) else None
        slider_values = apply_variation(sliders, attempt_index, max_attempts, product_config, planned_values) if sliders else {}
        signature = public_parameter_signature(product_config, slider_values)
        if signature and signature in seen_parameter_signatures:
            log("Amostra duplicada descartada antes do export: {} tentativa {}".format(base_name, attempt_index + 1))
            continue
        if signature:
            seen_parameter_signatures.add(signature)
        unsafe_reason = slicer_unsafe_sample_reason(base_name, slider_values)
        if unsafe_reason:
            log("Amostra descartada antes do export: {} tentativa {} ({})".format(base_name, attempt_index + 1, unsafe_reason))
            continue
        solve(ghdoc)
        sample_number = sample_offset + len(rows) + 1
        sample_id = "{}__v{:02d}".format(family_slug, sample_number)
        geometries = collect_geometries(export_component, only_export_output)
        if not geometries:
            log("Sem solidos exportaveis no {}: {} tentativa {}".format(selection_source, base_name, attempt_index + 1))
            continue

        geom = final_export_geometry(geometries, selection_source, sample_id)
        if geom is None:
            continue
        geom = add_base_shoe_neck_if_missing(geom, product_config, slider_values, sample_id)
        object_id = add_geometry(geom)
        rhino_object = Rhino.RhinoDoc.ActiveDoc.Objects.Find(object_id)
        if rhino_object is None:
            log("Rhino nao adicionou solido valido no {}: {} tentativa {}".format(selection_source, base_name, attempt_index + 1))
            continue
        metric_values = metrics(rhino_object)
        output_path = os.path.join(OUT_DIR, sample_id + ".3mf")
        stl_path = os.path.join(STL_DIR, sample_id + ".stl")
        export_3mf(output_path, object_id)
        export_stl(stl_path, object_id)

        row = {
            "source_gh": os.path.relpath(gh_path, REPO_ROOT).replace("\\", "/"),
            "sample_id": sample_id,
            "variation_index": attempt_index + 1,
            "product_family": product_config.get("product_family", "") if product_config else "",
            "category_slug": product_config.get("category_slug", "") if product_config else "",
            "format_slug": product_config.get("format_slug", "") if product_config else "",
            "variant_slug": product_config.get("variant_slug", "") if product_config else "",
            "has_neck": bool_text(product_config.get("has_neck", False)) if product_config else "",
            "sample_strategy": product_config.get("sample_strategy", "product_axis_low_discrepancy_ranges") if product_config else "grasshopper_slider_ranges",
            "export_selection": selection_source,
            "slider_values": format_slider_values(slider_values),
            "model_file": os.path.relpath(output_path, REPO_ROOT).replace("\\", "/"),
            "stl_file": os.path.relpath(stl_path, REPO_ROOT).replace("\\", "/"),
        }
        row.update(parameter_values(product_config, slider_values))
        row.update(metric_values)
        row.update(empty_slice_values())
        rows.append(row)
        log("Exportado {}".format(output_path))
    if len(rows) < target_valid:
        log("AVISO: {} gerou apenas {} de {} amostras validas no {}".format(base_name, len(rows), target_valid, selection_source))
    return rows


def write_dataset(rows):
    if APPEND_DATASET and REPLACE_EXISTING and os.path.isfile(DATASET_PATH) and rows:
        replace_keys = set([
            (
                row.get("category_slug", ""),
                row.get("format_slug", ""),
                row.get("variant_slug", "")
            )
            for row in rows
        ])
        preserved_rows = [
            row for row in existing_dataset_rows()
            if (
                row.get("category_slug", ""),
                row.get("format_slug", ""),
                row.get("variant_slug", "")
            ) not in replace_keys
        ]
        rows = preserved_rows + rows

    mode = "ab" if APPEND_DATASET and not REPLACE_EXISTING and os.path.isfile(DATASET_PATH) else "wb"
    with open(DATASET_PATH, mode) as handle:
        writer = csv.DictWriter(handle, fieldnames=CANONICAL_HEADERS)
        if mode == "wb":
            writer.writeheader()
        for row in rows:
            normalized = {}
            for header in CANONICAL_HEADERS:
                normalized[header] = row.get(header, "")
            writer.writerow(normalized)


def main():
    ensure_dirs()
    if os.path.isfile(LOG_PATH):
        os.remove(LOG_PATH)
    clean_generated_outputs()
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
