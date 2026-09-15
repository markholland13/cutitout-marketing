"""Blender masters for the visual design handbook.

Blender --background --python build_visual_guidelines.py -- --stills
Blender --background --python build_visual_guidelines.py -- --motion
The models illustrate geometry; they are not a cutting or fit simulation.
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'static/img/guidelines/visual'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, metallic=0, roughness=.4):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if metallic:
        tex = mat.node_tree.nodes.new('ShaderNodeTexNoise')
        tex.inputs['Scale'].default_value = 175
        bump = mat.node_tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .12
        bump.inputs['Distance'].default_value = .006
        mat.node_tree.links.new(tex.outputs['Fac'], bump.inputs['Height'])
        mat.node_tree.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


STEEL = material('Satin steel', (.26, .31, .33), .85, .27)
TEAL = material('Blue green coating', (.065, .25, .25), .35, .31)
GROUND = material('Warm studio', (.81, .795, .75), 0, .7)
DARK = material('Graphite studio', (.018, .027, .029), 0, .6)
BOLT = material('Machined steel', (.3, .34, .36), .86, .24)


def finish(obj, mat, bevel=.035):
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.material_index = 0
    if bevel:
        mod = obj.modifiers.new('Machined edge highlights', 'BEVEL')
        mod.width = bevel
        mod.segments = 3
    normal = obj.modifiers.new('Weighted surface normals', 'WEIGHTED_NORMAL')
    return obj


def box(name, loc, scale, mat=None, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        finish(obj, mat, bevel)
    return obj


def cylinder(name, loc, radius, depth, mat=None, vertices=96):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = bpy.context.object
    obj.name = name
    if mat:
        finish(obj, mat, .018)
        for face in obj.data.polygons:
            face.use_smooth = len(face.vertices) == 4
    return obj


def subtract(obj, cutter):
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new('Actual through cut', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.object = cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def sector(start, end, z=1.5):
    count = 64
    angles = [math.radians(start + (end-start)*i/count) for i in range(count+1)]
    points = [(1.42*math.cos(a), 1.42*math.sin(a)) for a in angles]
    points += [(.87*math.cos(a), .87*math.sin(a)) for a in reversed(angles)]
    n = len(points)
    verts = [(x, y, h) for h in (z-.5, z+.5) for x, y in points]
    faces = [tuple(reversed(range(n))), tuple(range(n, n*2))]
    faces += [(i, (i+1)%n, (i+1)%n+n, i+n) for i in range(n)]
    mesh = bpy.data.meshes.new('Stencil opening mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('Stencil opening', mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def plate(name, bridged=True, z=1.5, mat=STEEL):
    obj = box(name, (0, 0, z), (5.7, 4.4, .14))
    if bridged:
        subtract(obj, sector(9, 171, z))
        subtract(obj, sector(189, 351, z))
    else:
        subtract(obj, cylinder('Round through cut', (0, 0, z), 1.42, 1))
    for x in (-2.3, 2.3):
        for y in (-1.65, 1.65):
            subtract(obj, cylinder('Fixing hole', (x, y, z), .12, 1))
    finish(obj, mat)
    return obj


def scene(name, dark=False, size=(1000, 760), camera=(6, -9, 12), target=(0, 0, .7), ortho=8.5):
    sc = bpy.data.scenes.new(name)
    bpy.context.window.scene = sc
    sc.render.engine = 'CYCLES'
    sc.cycles.samples = 32
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = size
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'JPEG'
    sc.render.image_settings.quality = 90
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    sc.world = bpy.data.worlds.new(name + ' world')
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes.get('Background')
    bg.inputs[0].default_value = (.32, .4, .44, 1) if dark else (.75, .8, .82, 1)
    bg.inputs[1].default_value = .22 if dark else .3
    box('Studio floor', (0, 0, -.13), (200, 200, .2), DARK if dark else GROUND, 0)
    for label, loc, power, scale, color in [
        ('Large softbox', (-4, -3, 9), 1100, 5, (1, .96, .9)),
        ('Cool edge light', (4, 3, 6), 1500, 4, (.8, .93, 1)),
        ('Front reflector', (1, -6, 4), 180, 4, (1, 1, 1)),
    ]:
        data = bpy.data.lights.new(label, 'AREA')
        data.energy, data.shape, data.size, data.color = power, 'DISK', scale, color
        ob = bpy.data.objects.new(label, data)
        sc.collection.objects.link(ob)
        ob.location = loc
        ob.rotation_euler = (Vector((0, 0, .7))-ob.location).to_track_quat('-Z', 'Y').to_euler()
    data = bpy.data.cameras.new(name + ' camera')
    cam = bpy.data.objects.new(name + ' camera', data)
    sc.collection.objects.link(cam)
    cam.location = camera
    cam.rotation_euler = (Vector(target)-cam.location).to_track_quat('-Z', 'Y').to_euler()
    data.type = 'ORTHO'
    data.ortho_scale = ortho
    sc.camera = cam
    return sc


def render(sc, name):
    bpy.context.window.scene = sc
    sc.render.filepath = str(OUT / name)
    bpy.ops.render.render(write_still=True)


bad = scene('01 Unconnected centre')
plate('Unbridged O', False)
island = cylinder('Loose letter centre', (0, 0, 1.5), .87, .14, STEEL)
for frame, loc, rot in [(1, (0, 0, 1.5), 0), (7, (0, 0, 1.5), 0), (15, (0, -.2, .17), -.08), (25, (.05, -2.3, .1), 0), (36, (.05, -2.3, .1), 0)]:
    island.location = loc
    island.rotation_euler.x = rot
    island.keyframe_insert(data_path='location', frame=frame)
    island.keyframe_insert(data_path='rotation_euler', frame=frame)
bad.frame_end = 36
bad.frame_set(36)

good = scene('02 Connected centre')
plate('O with two permanent stencil bridges')

hero = scene('00 Handbook cover', True, (1440, 1160), (8, -10, 14), (0, 0, 1), 10)
cover = plate('Finished stencil plate', True, 1.8)
cover.rotation_euler.z = -.22
cover.location.x = .45
cover.location.y = -.7
rear = box('Second example plate', (-1, 1.6, .55), (5.2, 3.2, .12))
for x in (-2.7, .7):
    subtract(rear, cylinder('Rear hole', (x, 1.6, .55), .35, 1))
subtract(rear, box('Long slot', (-1, 1.6, .55), (1.6, .4, 1)))
finish(rear, TEAL)
rear.rotation_euler.z = .18

holes = scene('03 Hole and slot detail', False, (1000, 760), (7, -10, 12), (0, 0, .35), 7.9)
sample = box('Hole and slot sample', (0, 0, .45), (5.4, 3.8, .28))
for x, radius in [(-1.65, .10), (0, .34), (1.65, .58)]:
    subtract(sample, cylinder('Internal feature', (x, .6, .45), radius, 1))
for x, width in [(-1.65, .14), (0, .4), (1.65, .65)]:
    subtract(sample, box('Internal slot', (x, -.7, .45), (width, 1, 1)))
finish(sample, STEEL)

bolt = scene('04 Clearance assembly', False, (1000, 760), (7, -10, 9), (0, 0, 1.1), 7)
sample = box('Clearance plate', (0, 0, .8), (4.4, 3.6, .24))
subtract(sample, cylinder('Clearance hole', (0, 0, .8), .47, 1))
finish(sample, STEEL)
shaft = cylinder('Bolt shaft', (0, 0, 2.25), .37, 1.8, BOLT)
head = cylinder('Hexagonal bolt head', (0, 0, 3.26), .66, .34, BOLT, 6)
for i in range(18):
    bpy.ops.mesh.primitive_torus_add(major_radius=.37, minor_radius=.022, major_segments=48, minor_segments=6, location=(0, 0, 1.39+i*.093))
    bpy.context.object.data.materials.append(BOLT)

fragile_scenes = []
for improved in (False, True):
    sc = scene('06 Generous connections' if improved else '05 Fragile connections', False,
               (1000, 760), (5, -8, 13), (0, 0, .4), 7.5)
    sample = box('Material remaining around holes', (0, 0, .45), (5.8, 3.8, .16))
    for x in (-1.25, 1.25) if improved else (-1.04, 1.04):
        subtract(sample, cylinder('Internal cut', (x, 0 if improved else .77, .45), .98, 1))
    finish(sample, STEEL, .012)
    fragile_scenes.append(sc)

micro = scene('07 Temporary manufacturing micro joint', False, (1000, 660),
              (4, -7, 8), (0, -1.25, .36), 3.3)
sheet = box('Sheet and retained part', (0, 0, .36), (7, 5, .14))
subtract(sheet, box('Top cut', (0, 1.25, .36), (4.28, .08, 1)))
for x in (-2.1, 2.1):
    subtract(sheet, box('Side cut', (x, 0, .36), (.08, 2.5, 1)))
for x in (-1.12, 1.12):
    subtract(sheet, box('Front cut beside holding tab', (x, -1.25, .36), (1.96, .08, 1)))
finish(sheet, STEEL, .006)

bpy.context.window.scene = hero
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'visual-guidelines.blend'))
args = sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['--stills']
if '--stills' in args:
    for sc, name in [(hero, 'cover.jpg'), (bad, 'stencil-before.jpg'), (good, 'stencil-after.jpg'), (holes, 'holes.jpg'), (bolt, 'bolt.jpg')]:
        render(sc, name)
if '--proof' in args:
    render(good, 'stencil-proof.jpg')
if '--details' in args:
    for sc, name in zip(fragile_scenes + [micro], ['fragile-before.jpg', 'fragile-after.jpg', 'micro-joint.jpg']):
        render(sc, name)
if '--motion' in args:
    bad.render.resolution_x, bad.render.resolution_y = 760, 578
    bad.cycles.samples = 16
    bad.render.image_settings.quality = 84
    (OUT / 'stencil-motion').mkdir(exist_ok=True)
    for frame in range(1, 37):
        bad.frame_set(frame)
        render(bad, f'stencil-motion/frame-{frame:03d}.jpg')
