import bpy
import math
from mathutils import Vector

ROOT = "/Users/Mark/Documents/Code Projects/cutitout-marketing"
BLEND = f"{ROOT}/manufacturing-journey-cut-it-out.blend"
GLB = f"{ROOT}/static/img/home/manufacturing-journey-cut-it-out.glb"
LOGO = f"{ROOT}/static/img/home/cut-it-out-logo.png"
PREVIEW_DIR = f"{ROOT}/static/img/home"

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.frame_start, scene.frame_end, scene.render.fps = 1, 240, 30
scene.world.color = (0.001, 0.0015, 0.0025)
scene.view_settings.look = "AgX - Medium High Contrast"


def mat(name, colour, metallic=0.0, rough=.35, emission=None, strength=0, micro=False):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*colour, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = rough
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1)
        shader.inputs["Emission Strength"].default_value = strength
    if micro:
        noise = material.node_tree.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 180
        noise.inputs["Detail"].default_value = 3
        bump = material.node_tree.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = .11
        bump.inputs["Distance"].default_value = .012
        material.node_tree.links.new(noise.outputs["Fac"], bump.inputs["Height"])
        material.node_tree.links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    material.diffuse_color = (*colour, 1)
    return material


def image_mat(name, path):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Roughness"].default_value = .28
    texture = material.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = bpy.data.images.load(path, check_existing=True)
    material.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    material.node_tree.links.new(texture.outputs["Alpha"], shader.inputs["Alpha"])
    if hasattr(material, "surface_render_method"):
        material.surface_render_method = "DITHERED"
    return material


M = {
    "black": mat("Cut It Out graphite", (.008, .012, .017), .75, .22, micro=True),
    "white": mat("Cut It Out warm white", (.68, .72, .74), .22, .27, micro=True),
    "steel": mat("Raw mild steel", (.16, .19, .20), .98, .36, micro=True),
    "finished": mat("Precision brushed finish", (.39, .46, .49), 1, .18, micro=True),
    "powder": mat("White powder coat", (.88, .9, .9), .32, .23, micro=True),
    "amber": mat("Laser safety glass", (.20, .055, .008), .25, .18, emission=(.18, .035, .003), strength=.45),
    "orange": mat("Cut It Out safety orange", (.78, .12, .008), .25, .24, emission=(.3, .025, .001), strength=.55),
    "laser": mat("Molten cut", (1, .012, .001), .05, .08, emission=(1, .004, .001), strength=12),
    "rubber": mat("Conveyor rubber", (.015, .017, .018), .02, .78, micro=True),
    "card": mat("Kraft packaging", (.31, .12, .035), 0, .76, micro=True),
    "tape": mat("Paper tape", (.65, .36, .11), 0, .48),
    "screen": mat("DXF screen", (.001, .008, .012), .15, .24, emission=(.001, .025, .038), strength=.45),
    "cyan": mat("DXF cyan", (.01, .55, .72), .05, .16, emission=(.005, .42, .62), strength=7),
    "ui_pale": mat("Quote interface white", (.82, .85, .87), .02, .48, emission=(.50, .54, .58), strength=.28),
    "ui_panel": mat("Quote interface panel", (.93, .95, .96), .01, .42, emission=(.68, .72, .75), strength=.22),
    "ui_teal": mat("Cut It Out interface teal", (.055, .20, .27), .08, .28, emission=(.035, .15, .21), strength=.65),
    "ui_ink": mat("Quote interface ink", (.018, .024, .036), .04, .34),
    "aluminium": mat("Laptop aluminium", (.40, .44, .47), .88, .24, micro=True),
}
LOGO_MAT = image_mat("Cut It Out identity", LOGO)


def cube(name, loc, scale, material, bevel=.02, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name, obj.scale = name, scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel:
        mod = obj.modifiers.new("Industrial edge", "BEVEL")
        mod.width, mod.segments = bevel, 3
    return obj


def cyl(name, loc, radius, depth, material, rot=(0, 0, 0), vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    edge = obj.modifiers.new("Edge", "BEVEL")
    edge.width, edge.segments = min(radius * .08, .012), 2
    return obj


def sphere(name, loc, radius, material):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def decal(name, loc, width, height, rot=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=2, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.scale = (width / 2, height / 2, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(LOGO_MAT)
    return obj


def text(body, loc, size, material, rot=(math.pi / 2, 0, 0)):
    bpy.ops.object.text_add(location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = f"Label {body}"
    obj.data.body, obj.data.align_x, obj.data.align_y = body, "CENTER", "CENTER"
    obj.data.size, obj.data.extrude, obj.data.bevel_depth = size, .012, .003
    obj.data.materials.append(material)
    return obj


def ui_text(body, loc, size, material, rot=(math.pi / 2, 0, 0)):
    obj = text(body, loc, size, material, rot)
    obj.data.extrude = .001
    obj.data.bevel_depth = .0004
    return obj


def key(obj, frame, loc=None, rot=None, scale=None):
    if loc is not None:
        obj.location = loc
        obj.keyframe_insert("location", frame=frame)
    if rot is not None:
        obj.rotation_euler = rot
        obj.keyframe_insert("rotation_euler", frame=frame)
    if scale is not None:
        obj.scale = scale
        obj.keyframe_insert("scale", frame=frame)


def look(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def camera_key(cam, frame, loc, target):
    cam.location = loc
    look(cam, target)
    cam.keyframe_insert("location", frame=frame)
    cam.keyframe_insert("rotation_euler", frame=frame)


def subtract(target, cutter, label):
    bpy.context.view_layer.objects.active = target
    mod = target.modifiers.new(label, "BOOLEAN")
    mod.operation, mod.solver, mod.object = "DIFFERENCE", "EXACT", cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)


# Industrial floor, sized in metres.
cube("Factory floor", (7.0, 0, -.16), (14, 6, .16), M["black"], .08)
for x in range(-4, 20, 2):
    cube("Floor safety dash", (x, -2.9, .015), (.55, .018, .008), M["orange"], .005)

# The journey begins at a real laptop showing the live Cut It Out quote flow.
# Only this opening vignette occupies frames 1–22; manufacturing starts unchanged after it.
cube("Design desk", (-4.1, -.78, .79), (1.52, .95, .06), M["black"], .045)
cube("Laptop lower shell", (-4.1, -1.00, .91), (.98, .66, .045), M["aluminium"], .055)
cube("Laptop keyboard well", (-4.1, -.90, .962), (.77, .43, .012), M["black"], .025)
for row in range(5):
    for col in range(12):
        cube(
            "Laptop keyboard key",
            (-4.62 + col * .095, -1.18 + row * .105, .984),
            (.037, .035, .008),
            M["ui_ink"],
            .008,
        )
cube("Laptop trackpad", (-4.1, -1.42, .982), (.30, .17, .006), M["aluminium"], .025)

# Screen and slim aluminium bezel, opened toward the viewer.
cube("Laptop display back", (-4.1, -.365, 1.65), (1.03, .035, .66), M["aluminium"], .065, rot=(math.radians(-4), 0, 0))
screen = cube("Cut It Out quote screen", (-4.1, -.407, 1.65), (.965, .008, .585), M["ui_pale"], .035, rot=(math.radians(-4), 0, 0))
decal("Cut It Out quote logo", (-4.64, -.443, 2.075), .42, .084, rot=(math.pi / 2 + math.radians(-4), 0, 0))

# The five live quote steps reproduced from app.cutitout.uk/quote.
step_y = -.448
for i, (label, x) in enumerate(zip(("1", "2", "3", "4", "5"), (-4.35, -4.08, -3.81, -3.54, -3.27))):
    cyl(f"Quote step {label}", (x, step_y, 2.07), .045, .012, M["ui_teal"] if i == 0 else M["ui_panel"], rot=(math.pi / 2, 0, 0), vertices=32)
    ui_text(label, (x, step_y - .009, 2.071), .045, M["white"] if i == 0 else M["ui_ink"], rot=(math.pi / 2, 0, 0))
for label, x in zip(("FILES", "MATERIAL", "SERVICES", "REVIEW", "SUBMIT"), (-4.35, -4.08, -3.81, -3.54, -3.27)):
    ui_text(label, (x, step_y - .010, 1.985), .026, M["ui_ink"], rot=(math.pi / 2, 0, 0))

# Upload panel, browse button and exact opening instruction from the live site.
cube("DXF upload panel", (-4.1, -.448, 1.62), (.84, .008, .27), M["ui_panel"], .035, rot=(math.radians(-4), 0, 0))
ui_text("DROP UP TO 10 DXF FILES", (-4.40, -.464, 1.77), .050, M["ui_ink"], rot=(math.pi / 2, 0, 0))
ui_text("HERE TO ADD THEM TO YOUR LIBRARY", (-4.25, -.466, 1.69), .026, M["ui_ink"], rot=(math.pi / 2, 0, 0))
cube("Browse files button", (-3.72, -.467, 1.54), (.34, .010, .065), M["ui_teal"], .032, rot=(math.radians(-4), 0, 0))
ui_text("BROWSE FILES", (-3.72, -.480, 1.545), .035, M["white"], rot=(math.pi / 2, 0, 0))

# A physical file card is dragged from the desk into the browser.
file_card = cube("DXF file being uploaded", (-4.72, -1.72, 1.30), (.18, .022, .23), M["ui_teal"], .030)
file_tab = cube("DXF file folded corner", (-4.60, -1.75, 1.45), (.050, .008, .050), M["ui_pale"], .010)
file_label = ui_text("DXF", (-4.72, -1.755, 1.27), .068, M["white"], rot=(math.pi / 2, 0, 0))
for obj in (file_card, file_tab, file_label):
    key(obj, 1, loc=obj.location, scale=(1, 1, 1))
    key(obj, 6, loc=obj.location, scale=(1, 1, 1))
key(file_card, 14, loc=(-4.08, -.52, 1.62), scale=(.45, .45, .45)); key(file_card, 15, scale=(0, 0, 0))
key(file_tab, 14, loc=(-4.025, -.535, 1.69), scale=(.45, .45, .45)); key(file_tab, 15, scale=(0, 0, 0))
key(file_label, 14, loc=(-4.08, -.55, 1.60), scale=(.45, .45, .45)); key(file_label, 15, scale=(0, 0, 0))

# Processing ring appears briefly, then the uploaded part card resolves in the library.
bpy.ops.mesh.primitive_torus_add(major_radius=.11, minor_radius=.020, major_segments=48, minor_segments=12, location=(-4.1, -.486, 1.61), rotation=(math.pi / 2, 0, 0))
processing_ring = bpy.context.object; processing_ring.name = "DXF processing ring"; processing_ring.data.materials.append(M["ui_teal"])
key(processing_ring, 1, scale=(0, 0, 0)); key(processing_ring, 14, scale=(0, 0, 0)); key(processing_ring, 15, scale=(1, 1, 1)); key(processing_ring, 17, scale=(1, 1, 1)); key(processing_ring, 18, scale=(0, 0, 0))

uploaded_border = cube("Uploaded DXF card border", (-4.1, -.480, 1.61), (.56, .012, .28), M["ui_teal"], .042, rot=(math.radians(-4), 0, 0))
uploaded_card = cube("Uploaded DXF library card", (-4.1, -.485, 1.61), (.52, .010, .24), M["ui_panel"], .035, rot=(math.radians(-4), 0, 0))
ready_label = ui_text("PART READY", (-3.78, -.502, 1.48), .030, M["ui_teal"], rot=(math.pi / 2, 0, 0))
file_name = ui_text("bracket-01.dxf", (-4.10, -.504, 1.40), .034, M["ui_ink"], rot=(math.pi / 2, 0, 0))
for obj in (uploaded_border, uploaded_card, ready_label, file_name):
    key(obj, 1, scale=(0, 0, 0)); key(obj, 17, scale=(0, 0, 0)); key(obj, 18, scale=(1, 1, 1)); key(obj, 24, scale=(1, 1, 1))

# The same thin bracket wireframe becomes the manufactured component later in the journey.
wireframe_parts = []
for x, z, sx, sz in [(-4.22, 1.69, .20, .007), (-4.22, 1.50, .20, .007), (-4.43, 1.595, .007, .095), (-4.01, 1.595, .007, .095)]:
    wireframe_parts.append(cube("Uploaded DXF outline", (x, -.510, z), (sx, .006, sz), M["ui_teal"], .004))
for x in (-4.36, -4.08):
    for z in (1.54, 1.65):
        wireframe_parts.append(cyl("Uploaded DXF fixing hole", (x, -.512, z), .018, .01, M["ui_teal"], rot=(math.pi / 2, 0, 0), vertices=24))
for obj in wireframe_parts:
    key(obj, 1, scale=(0, 0, 0)); key(obj, 17, scale=(0, 0, 0)); key(obj, 18, scale=(1, 1, 1)); key(obj, 24, scale=(1, 1, 1))

# Full-size enclosed fibre laser: 4.955 x 2.320 x 2.200 m reference envelope.
BX = 0.0
cube("Fibre laser lower chassis", (BX, 0, .34), (2.4775, 1.16, .34), M["black"], .08)
cube("Fibre laser rear enclosure", (BX, 1.03, 1.35), (2.42, .12, .88), M["white"], .06)
cube("Fibre laser left enclosure", (BX - 2.35, 0, 1.35), (.12, 1.05, .88), M["white"], .06)
cube("Fibre laser right enclosure", (BX + 2.35, 0, 1.35), (.12, 1.05, .88), M["white"], .06)
cube("Fibre laser roof", (BX, 0, 2.12), (2.42, 1.05, .10), M["white"], .06)
front_left = cube("Fibre laser front shell left", (BX - 1.65, -1.05, 1.35), (.72, .10, .88), M["white"], .05)
front_right = cube("Fibre laser front shell right", (BX + 1.65, -1.05, 1.35), (.72, .10, .88), M["white"], .05)
window = cube("Laser protection window", (BX, -1.07, 1.46), (.88, .035, .47), M["amber"], .035)
decal("Cut It Out laser logo", (BX - 1.66, -1.158, 1.04), 1.08, .216)
cube("Laser touchscreen arm", (BX + 2.58, -.72, 1.38), (.18, .12, .72), M["black"], .04)
cube("Laser touchscreen controller", (BX + 2.62, -.78, 1.75), (.34, .08, .23), M["screen"], .035, rot=(0, 0, math.radians(-8)))

# Panel seams, ventilation, rails and gantry make the enclosure read as production machinery.
for x in (-2.10, -1.20, 1.20, 2.10):
    cube("Laser enclosure panel seam", (BX + x, -1.158, 1.30), (.006, .006, .78), M["black"], .001)
for z in (.82, .92, 1.02, 1.12, 1.22):
    cube("Laser ventilation slot", (BX + 2.356, -.40, z), (.006, .38, .012), M["black"], .002)
for y in (-.80, .80):
    cube("Laser precision rail", (BX, y, .91), (1.55, .025, .025), M["finished"], .006)
cube("Laser gantry beam", (BX, 0, 1.34), (.10, .88, .075), M["black"], .018)
for y in (-.76, .76):
    cube("Laser gantry carriage", (BX, y, 1.23), (.18, .08, .11), M["black"], .018)
for i in range(14):
    cube("Laser cable chain link", (BX - .62 + i * .065, .73, 1.18 + (i % 2) * .012), (.026, .04, .025), M["rubber"], .006)
cyl("Laser extraction duct", (BX - 1.90, 1.02, 1.64), .12, .42, M["black"], rot=(math.pi / 2, 0, 0), vertices=48)

# The 3048 x 1524 mm cutting bed and serrated support slats.
for x in [BX - 1.45 + i * .10 for i in range(30)]:
    cube("Laser support slat", (x, 0, .74), (.018, .75, .055), M["steel"], .004)

# A real 6 mm sheet with the part nested inside it.
sheet_loc = (BX + .15, 0, .815)
full_sheet = cube("Uncut 3048 x 1524 sheet", sheet_loc, (1.524, .762, .003), M["steel"], .004)
skeleton = full_sheet.copy()
skeleton.data = full_sheet.data.copy()
skeleton.name = "Sheet after part removal"
bpy.context.collection.objects.link(skeleton)

outer_cutter = cube("Part profile cutter", (BX + .15, 0, .815), (.34, .215, .05), M["black"], .035)
subtract(skeleton, outer_cutter, "Removed component profile")
bpy.data.objects.remove(outer_cutter, do_unlink=True)

# The actual thin part: 620 x 380 x 6 mm, not a chunky block.
part_raw = cube("Cut component raw", (BX + .15, 0, .815), (.31, .19, .003), M["steel"], .022)
part_cutters = []
for x in (-.22, .22):
    for y in (-.11, .11):
        part_cutters.append(cyl("Part hole cutter", (BX + .15 + x, y, .815), .035, .08, M["black"]))
part_cutters.append(cyl("Part centre cutter", (BX + .15, 0, .815), .078, .08, M["black"]))
for cutter in part_cutters:
    subtract(part_raw, cutter, "Laser-cut aperture")
for cutter in part_cutters:
    bpy.data.objects.remove(cutter, do_unlink=True)

part_finished = part_raw.copy(); part_finished.data = part_raw.data.copy(); part_finished.name = "Precision-finished part"; part_finished.data.materials.clear(); part_finished.data.materials.append(M["finished"]); bpy.context.collection.objects.link(part_finished)
part_white = part_raw.copy(); part_white.data = part_raw.data.copy(); part_white.name = "White powder-coated part"; part_white.data.materials.clear(); part_white.data.materials.append(M["powder"]); bpy.context.collection.objects.link(part_white)
bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
part_rig = bpy.context.object
part_rig.name = "PART JOURNEY — CAMERA ANCHOR"
for obj in (part_raw, part_finished, part_white):
    obj.parent = part_rig

# A video-reference-inspired cutting head: black body, knurled focus ring and copper nozzle.
head_rig = bpy.data.objects.new("Fibre cutting head rig", None); bpy.context.collection.objects.link(head_rig)
head_body = cyl("Fibre cutting head body", (0, 0, 1.38), .14, .55, M["black"], vertices=72)
focus_ring = cyl("Knurled focus ring", (0, 0, 1.07), .15, .13, M["finished"], vertices=96)
nozzle = cyl("Copper laser nozzle", (0, 0, .94), .055, .15, M["orange"], vertices=64)
beam = cyl("Live fibre-laser cut", (0, 0, .865), .004, .12, M["laser"], vertices=16)
for obj in (head_body, focus_ring, nozzle, beam): obj.parent = head_rig
key(head_rig, 1, loc=(BX - .65, -.42, .08)); key(head_rig, 44, loc=(BX - .18, -.13, .03)); key(head_rig, 58, loc=(BX + .48, -.13, .03)); key(head_rig, 70, loc=(BX + .48, .13, .03)); key(head_rig, 82, loc=(BX - .18, .13, .03)); key(head_rig, 94, loc=(BX - .18, -.13, .03)); key(head_rig, 104, loc=(BX + 1.2, .55, .7))

# Hot sparks are tiny and localised, matching the supplied cutting video.
for i in range(16):
    angle = i * 2.399
    radius = .012 + (i % 6) * .007
    spark = cyl("Fine laser spark", (math.cos(angle) * radius, math.sin(angle) * radius, .86 + (i % 4) * .004), .0007, .005 + (i % 4) * .003, M["laser"], rot=(angle, angle * .4, angle), vertices=8)
    spark.parent = head_rig
    key(spark, 1, scale=(0, 0, 0)); key(spark, 43, scale=(0, 0, 0)); key(spark, 48 + i % 7, scale=(1, 1, 1)); key(spark, 98, scale=(0, 0, 0))

# Sheet state: whole sheet during cutting, then skeleton and freed component.
key(full_sheet, 1, scale=(1, 1, 1)); key(full_sheet, 96, scale=(1, 1, 1)); key(full_sheet, 98, scale=(0, 0, 0))
key(skeleton, 1, scale=(0, 0, 0)); key(skeleton, 96, scale=(0, 0, 0)); key(skeleton, 98, scale=(1, 1, 1))
key(part_raw, 1, scale=(0, 0, 0)); key(part_raw, 96, scale=(0, 0, 0)); key(part_raw, 98, scale=(1, 1, 1)); key(part_raw, 151, scale=(1, 1, 1)); key(part_raw, 154, scale=(0, 0, 0))
key(part_finished, 1, scale=(0, 0, 0)); key(part_finished, 151, scale=(0, 0, 0)); key(part_finished, 154, scale=(1, 1, 1)); key(part_finished, 188, scale=(1, 1, 1)); key(part_finished, 191, scale=(0, 0, 0))
key(part_white, 1, scale=(0, 0, 0)); key(part_white, 188, scale=(0, 0, 0)); key(part_white, 191, scale=(1, 1, 1)); key(part_white, 240, scale=(1, 1, 1))

# Magnetic lift removes the part from the sheet and carries it to finishing.
lift_rig = bpy.data.objects.new("Magnetic part lift", None); bpy.context.collection.objects.link(lift_rig)
lift_bar = cube("Lift crossbeam", (0, 0, .3), (.38, .055, .045), M["black"], .018)
for x in (-.22, .22):
    magnet = cyl("Lift magnet", (x, 0, .18), .045, .16, M["orange"]); magnet.parent = lift_rig
lift_bar.parent = lift_rig
key(lift_rig, 1, loc=(BX + .15, 0, 2.3)); key(lift_rig, 100, loc=(BX + .15, 0, .92)); key(lift_rig, 112, loc=(BX + .15, 0, 1.35)); key(lift_rig, 128, loc=(5.0, 0, 1.35)); key(lift_rig, 138, loc=(5.0, 0, 2.5))
key(part_rig, 1, loc=(0, 0, 0)); key(part_rig, 108, loc=(0, 0, 0)); key(part_rig, 112, loc=(0, 0, .43)); key(part_rig, 128, loc=(4.85, 0, .43)); key(part_rig, 138, loc=(5.80, 0, .262)); key(part_rig, 151, loc=(7.0, 0, .262)); key(part_rig, 178, loc=(11.65, 0, .48)); key(part_rig, 198, loc=(11.65, 0, .48)); key(part_rig, 205, loc=(15.0, 0, .58)); key(part_rig, 226, loc=(15.0, 0, -.28))
key(part_finished, 176, rot=(0, 0, 0)); key(part_finished, 180, rot=(0, math.pi / 2, 0)); key(part_finished, 191, rot=(0, math.pi / 2, 0))
key(part_white, 188, rot=(0, math.pi / 2, 0)); key(part_white, 198, rot=(0, math.pi / 2, 0)); key(part_white, 205, rot=(0, 0, 0))

# Full-size precision finishing machine, with an open conveyor tunnel the camera can ride through.
TX = 7.0
for y in (-.82, .82):
    cube("Finishing machine side cabinet", (TX, y, .94), (1.12, .11, .94), M["white"], .07)
cube("Finishing machine upper housing", (TX, 0, 1.78), (1.12, .93, .32), M["black"], .09)
for x in (TX - 1.13, TX + 1.13):
    for y in (-.65, .65):
        cube("Finishing tunnel post", (x, y, 1.31), (.08, .08, .31), M["black"], .025)
    cube("Finishing tunnel header", (x, 0, 1.57), (.08, .73, .08), M["orange"], .025)
cube("Finishing machine orange fascia", (TX, -.95, 1.62), (.72, .025, .34), M["orange"], .035)
decal("Cut It Out finishing logo", (TX, -.978, 1.63), 1.08, .216)
for x in [TX - 1.75 + i * .16 for i in range(23)]:
    cyl("Finishing conveyor roller", (x, 0, 1.02), .035, 1.35, M["finished"], rot=(math.pi / 2, 0, 0), vertices=32)
cube("High-friction conveyor belt", (TX, 0, 1.058), (2.08, .66, .012), M["rubber"], .006)
abrasive = cyl("Wide abrasive contact head", (TX, 0, 1.30), .20, 1.35, M["rubber"], rot=(math.pi / 2, 0, 0), vertices=96)
key(abrasive, 132, rot=(math.pi / 2, 0, 0)); key(abrasive, 164, rot=(math.pi / 2, math.radians(1440), 0))
for x in (TX - .55, TX + .55):
    cyl("Finishing dust extraction port", (x, 0, 2.20), .14, .34, M["black"], vertices=48)
cube("Finishing HMI arm", (TX + .94, -1.06, 1.42), (.05, .16, .32), M["black"], .018)
cube("Finishing HMI screen", (TX + .94, -1.24, 1.65), (.22, .055, .16), M["screen"], .025, rot=(math.radians(-8), 0, 0))
for x in (TX - .70, TX + .70):
    for y in (-.78, .78):
        cyl("Finishing table spindle", (x, y, .42), .045, .70, M["finished"], vertices=32)

# Manual powder-coating system and open-through booth, using white powder.
GX = 11.8
cube("Powder booth left wall", (GX, -1.27, 1.45), (1.35, .08, 1.45), M["white"], .06)
cube("Powder booth right wall", (GX, 1.27, 1.45), (1.35, .08, 1.45), M["white"], .06)
cube("Powder booth roof", (GX, 0, 2.82), (1.35, 1.27, .08), M["white"], .06)
cube("Powder booth extraction wall", (GX, 1.16, 1.35), (1.18, .025, .92), M["black"], .03)
for y in (-1.05, 1.05):
    cube("Powder booth entry post", (GX - 1.36, y, 1.42), (.05, .16, 1.18), M["black"], .03)
cube("Powder booth entry header", (GX - 1.36, 0, 2.55), (.05, 1.2, .12), M["black"], .03)
cube("Powder unit cart", (GX, -1.85, .62), (.34, .28, .62), M["black"], .06)
cube("Powder unit controller", (GX, -1.86, 1.28), (.30, .18, .18), M["screen"], .03, rot=(math.radians(-10), 0, 0))
cyl("Powder fluidising hopper", (GX, -1.85, .48), .24, .62, M["white"], vertices=64)
decal("Cut It Out powder logo", (GX, -1.355, 1.90), .92, .184)
gun_rig = bpy.data.objects.new("Electrostatic powder gun rig", None); bpy.context.collection.objects.link(gun_rig)
gun_body = cyl("Electrostatic powder gun", (0, 0, 0), .075, .78, M["white"], rot=(0, math.pi / 2, 0), vertices=64)
gun_nozzle = cyl("Powder gun nozzle", (-.45, 0, 0), .038, .20, M["black"], rot=(0, math.pi / 2, 0)); gun_body.parent = gun_nozzle.parent = gun_rig
key(gun_rig, 1, loc=(GX + 1.3, -1.5, 1.8), rot=(0, 0, math.radians(45))); key(gun_rig, 169, loc=(GX + .25, -.95, 1.55), rot=(0, 0, math.radians(45))); key(gun_rig, 190, loc=(GX + .15, -.48, 1.28), rot=(0, 0, math.radians(58))); key(gun_rig, 200, loc=(GX + 1.5, 1.4, 2.1), rot=(0, 0, math.radians(58)))
for i in range(90):
    angle = i * 1.618
    radius = .08 + (i % 13) * .035
    p = sphere("White electrostatic powder", (GX + math.cos(angle) * radius, math.sin(angle) * radius, 1.0 + (i % 11) * .045), .0008 + (i % 4) * .00025, M["powder"])
    key(p, 1, scale=(0, 0, 0)); key(p, 170, scale=(0, 0, 0)); key(p, 175 + i % 8, scale=(1, 1, 1)); key(p, 198, scale=(0, 0, 0))

# Packaging and post: part lowers into a box, lid closes and a shipping label appears.
PX = 15.0
box_base = cube("Postal carton base", (PX, 0, .22), (.62, .46, .22), M["card"], .045)
insert = cube("Protective foam insert", (PX, 0, .47), (.54, .38, .04), M["black"], .05)
lid = cube("Postal carton lid", (PX, .43, .85), (.62, .045, .42), M["card"], .04, rot=(math.radians(-42), 0, 0))
shipping = cube("Shipping label", (PX, -.465, .29), (.22, .012, .11), M["white"], .01)
shipping_logo = decal("Cut It Out parcel logo", (PX, -.479, .30), .34, .068)
key(box_base, 1, scale=(0, 0, 0)); key(box_base, 198, scale=(0, 0, 0)); key(box_base, 205, scale=(1, 1, 1))
key(insert, 1, scale=(0, 0, 0)); key(insert, 198, scale=(0, 0, 0)); key(insert, 205, scale=(1, 1, 1))
key(lid, 1, scale=(0, 0, 0)); key(lid, 205, scale=(1, 1, 1), rot=(math.radians(-42), 0, 0)); key(lid, 228, scale=(1, 1, 1), rot=(math.radians(-42), 0, 0)); key(lid, 238, scale=(1, 1, 1), rot=(math.radians(-90), 0, 0), loc=(PX, 0, .59))
key(shipping, 1, scale=(0, 0, 0)); key(shipping, 228, scale=(0, 0, 0)); key(shipping, 236, scale=(1, 1, 1))
key(shipping_logo, 1, scale=(0, 0, 0)); key(shipping_logo, 228, scale=(0, 0, 0)); key(shipping_logo, 236, scale=(1, 1, 1))

# Camera: DXF upload -> exterior i7 -> through safety window -> sheet-level cutting -> ride with part.
bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, .9))
focus = bpy.context.object; focus.name = "Camera focus"
bpy.ops.object.camera_add(location=(-4.1, -4.3, 1.75))
cam = bpy.context.object; cam.name = "SCROLL CAMERA — PART POV"; cam.data.lens = 58; cam.data.dof.use_dof = False; scene.camera = cam
camera_key(cam, 1, (-4.10, -5.55, 2.34), (-4.10, -.58, 1.40))
camera_key(cam, 10, (-4.10, -5.10, 2.20), (-4.10, -.50, 1.48))
camera_key(cam, 18, (-4.10, -4.88, 2.12), (-4.10, -.46, 1.53))
camera_key(cam, 22, (-3.8, -4.2, 2.25), (0, 0, 1.1))
camera_key(cam, 38, (-1.5, -2.4, 1.62), (0, -.95, 1.45))
camera_key(cam, 48, (-.92, -.92, 1.16), (.15, 0, .83))
camera_key(cam, 82, (.92, -.98, 1.12), (.15, 0, .83))
camera_key(cam, 104, (.82, -1.55, 1.52), (.15, 0, .86))
camera_key(cam, 118, (1.15, -2.05, 1.74), (.15, 0, 1.10))
camera_key(cam, 138, (4.40, -.55, 1.48), (6.10, 0, 1.05))
camera_key(cam, 154, (5.70, -.45, 1.32), (7.00, 0, 1.05))
camera_key(cam, 176, (9.45, -.32, 1.48), (11.75, 0, 1.12))
camera_key(cam, 194, (10.70, -.18, 1.34), (11.90, 0, 1.08))
camera_key(cam, 212, (12.85, -2.55, 1.72), (15.05, 0, .53))
camera_key(cam, 240, (16.85, -2.75, 1.82), (15.05, 0, .48))

# Safety glass vanishes exactly as the camera passes through it.
key(window, 1, scale=(1, 1, 1)); key(window, 36, scale=(1, 1, 1)); key(window, 41, scale=(0, 0, 0)); key(window, 240, scale=(0, 0, 0))

# Industrial lighting plus the warm cut-pool light from the reference video.
lights = [
    ((0, -4, 5.5), 1700, (.45, .60, 1), 4.5, (0, 0, 1)),
    ((0, 1.6, 3.8), 1250, (.8, .88, 1), 3.2, (0, 0, .8)),
    ((7, -2.0, 4.2), 1350, (.38, .62, 1), 3.4, (7, 0, 1)),
    ((6.35, 0, 1.50), 420, (.72, .86, 1), 1.0, (7.0, 0, 1.04)),
    ((11.8, -2, 4.0), 1450, (.55, .68, 1), 3.2, (11.8, 0, 1)),
    ((15, -2.2, 3.6), 1150, (.75, .82, 1), 3.2, (15, 0, .5)),
    ((.15, -.2, 1.4), 520, (1, .025, .004), .55, (.15, 0, .82)),
]
for i, (loc, energy, colour, size, target) in enumerate(lights):
    bpy.ops.object.light_add(type="AREA", location=loc)
    light = bpy.context.object; light.name = f"Production light {i+1}"; light.data.energy = energy; light.data.color = colour; light.data.shape = "DISK"; light.data.size = size; look(light, target)
    if i == 6:
        light.data.energy = 0; light.data.keyframe_insert("energy", frame=1)
        light.data.energy = 55; light.data.keyframe_insert("energy", frame=44); light.data.keyframe_insert("energy", frame=94)
        light.data.energy = 0; light.data.keyframe_insert("energy", frame=104)

bpy.ops.object.light_add(type="POINT", location=(6.35, 0, 1.34))
inspection = bpy.context.object
inspection.name = "Finishing tunnel inspection light"
inspection.data.energy = 95
inspection.data.color = (.62, .78, 1.0)
inspection.data.shadow_soft_size = .36

for frame, title in [(1, "UPLOAD DXF"), (22, "ENTER FIBRE LASER"), (48, "LASER CUTTING"), (98, "PART RELEASE"), (138, "PRECISION FINISH"), (176, "WHITE POWDER COAT"), (212, "PACK AND POST")]:
    scene.timeline_markers.new(title, frame=frame)

# Save a production file and web animation. Render checkpoints for review.
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
bpy.ops.export_scene.gltf(
    filepath=GLB,
    export_format="GLB",
    export_animations=True,
    export_cameras=True,
)
for frame, name in [(5, "dxf"), (22, "fibre-laser"), (62, "inside-laser"), (116, "part-release"), (140, "precision-finishing"), (194, "white-coat"), (240, "pack-post")]:
    scene.frame_set(frame)
    scene.render.filepath = f"{PREVIEW_DIR}/manufacturing-journey-cut-it-out-{name}.png"
    bpy.ops.render.render(write_still=True)
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
print("FULL-SCALE CUT IT OUT MANUFACTURING JOURNEY COMPLETE")
