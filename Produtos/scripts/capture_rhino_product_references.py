import os
import sys
import struct
import Rhino
import scriptcontext as sc


ROOT = os.environ.get("TRACO_BASE_REPO", r"C:\Users\Administrador\Desktop\SCRIPTS\site-sapatas")
STL_DIR = os.path.join(ROOT, "Produtos", "STL")
OUT_DIR = os.path.join(ROOT, "public", "products", "rhino-reference")
LOG_FILE = os.path.join(ROOT, "Produtos", "logs", "rhino_reference_capture.log")

PRODUCTS = {
    "sapata-lisa-redonda": [
        "Sapata_Lisa_Redonda__v20.stl",
        "Sapata_Lisa_Redonda-com-Haste__v80.stl",
        "Sapata_Lisa_Redonda-com-parafuso__v40.stl",
    ],
    "sapata-lisa-quadrada": [
        "Sapata_Lisa_Quadrada__v30.stl",
        "Sapata_Lisa_Quadrada-com-haste__v120.stl",
        "Sapata_Lisa_Quadrada-com-parafuso__v60.stl",
    ],
    "sapata-tubo-redondo": [
        "Sapata_Interna_Tubo-Redondo__v80.stl",
        "Sapata_Interna_Tubo-Redondo__v200.stl",
        "Sapata_Interna_Tubo-Redondo__v320.stl",
    ],
    "sapata-tubo-quadrado": [
        "Sapata_Interna_Tubo-Quadrado__v120.stl",
        "Sapata_Interna_Tubo-Quadrado__v1200.stl",
        "Sapata_Interna_Tubo-Quadrado__v2500.stl",
    ],
    "sapata-tubo-oblongo": [
        "Sapata_Interna_Tubo-Oblongo__v60.stl",
        "Sapata_Interna_Tubo-Oblongo__v140.stl",
        "Sapata_Interna_Tubo-Oblongo__v220.stl",
    ],
}


def run(command):
    log("RUN " + command)
    Rhino.RhinoApp.RunScript(command, False)


def log(message):
    log_dir = os.path.dirname(LOG_FILE)
    if not os.path.isdir(log_dir):
        os.makedirs(log_dir)
    with open(LOG_FILE, "a") as f:
        f.write(message + "\n")


def setup_artistic_display():
    run("_SelNone")
    run("_-SetDisplayMode _Mode=Artistic _Enter")
    view = sc.doc.Views.ActiveView
    if view:
        view.ActiveViewport.DisplayMode = Rhino.Display.DisplayModeDescription.FindByName("Artistic")
        view.Redraw()


def import_stl(path, offset_x):
    log("IMPORT " + path)
    mesh = read_stl_mesh(path)
    mesh.Translate(Rhino.Geometry.Vector3d(offset_x, 0, 0))
    attr = Rhino.DocObjects.ObjectAttributes()
    attr.WireDensity = -1
    obj_id = sc.doc.Objects.AddMesh(mesh, attr)
    log("ADD_MESH {}".format(obj_id))
    run("_SelNone")


def read_stl_mesh(path):
    with open(path, "rb") as f:
        data = f.read()
    if len(data) >= 84:
        tri_count = struct.unpack("<I", data[80:84])[0]
        expected = 84 + tri_count * 50
        if expected == len(data):
            return read_binary_stl_mesh(data, tri_count)
    return read_ascii_stl_mesh(data.decode("utf-8", "ignore"))


def read_binary_stl_mesh(data, tri_count):
    mesh = Rhino.Geometry.Mesh()
    offset = 84
    for _ in range(tri_count):
        offset += 12
        idxs = []
        for _v in range(3):
            x, y, z = struct.unpack("<fff", data[offset:offset + 12])
            idxs.append(mesh.Vertices.Add(x, y, z))
            offset += 12
        mesh.Faces.AddFace(idxs[0], idxs[1], idxs[2])
        offset += 2
    mesh.Normals.ComputeNormals()
    mesh.Compact()
    return mesh


def read_ascii_stl_mesh(text):
    mesh = Rhino.Geometry.Mesh()
    verts = []
    for line in text.splitlines():
        parts = line.strip().split()
        if len(parts) == 4 and parts[0].lower() == "vertex":
            verts.append(tuple(float(v) for v in parts[1:4]))
            if len(verts) == 3:
                idxs = [mesh.Vertices.Add(*v) for v in verts]
                mesh.Faces.AddFace(idxs[0], idxs[1], idxs[2])
                verts = []
    mesh.Normals.ComputeNormals()
    mesh.Compact()
    return mesh


def main():
    log("START")
    if not os.path.isdir(OUT_DIR):
        os.makedirs(OUT_DIR)

    env_slug = os.environ.get("RHINO_CAPTURE_SLUG", "").strip()
    requested = [env_slug] if env_slug else (sys.argv[1:] if len(sys.argv) > 1 else [])
    slugs = requested or sorted(PRODUCTS.keys())

    for slug in slugs:
        log("SLUG " + slug)
        filenames = PRODUCTS[slug]
        run("_SelAll _Delete")
        setup_artistic_display()

        offset = -80
        for filename in filenames:
            path = os.path.join(STL_DIR, filename)
            if os.path.isfile(path):
                import_stl(path, offset)
                offset += 80

        run("_SelAll")
        run("z")
        run("_SelNone")
        setup_artistic_display()
        out = os.path.join(OUT_DIR, slug + ".png")
        log("CAPTURE " + out)
        run('-_ViewCaptureToFile "{}" _Width=1600 _Height=1000 _Scale=1 _DrawGrid=No _DrawWorldAxes=No _DrawCPlaneAxes=No _TransparentBackground=No _Enter'.format(out))
        log("DONE " + slug)


if __name__ == "__main__":
    main()
