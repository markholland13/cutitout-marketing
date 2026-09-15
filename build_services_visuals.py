"""Render matching uncoated/coated parts for the Services page.
Reuses the handbook's Blender studio helpers, without rebuilding its assets.
Blender --background --python build_services_visuals.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
helpers = (ROOT / 'build_visual_guidelines.py').read_text().split('\nbad = scene(')[0]
exec(compile(helpers, str(ROOT / 'build_visual_guidelines.py'), 'exec'))
OUT = ROOT / 'static/img/services/visual'
OUT.mkdir(parents=True, exist_ok=True)

GROUND.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value = (.76, .80, .81, 1)
COAT = material('Textured black powder coat — supplied reference', (.006, .006, .006), 0, .52)
coat_nodes = COAT.node_tree.nodes
coat_links = COAT.node_tree.links
coat_bsdf = coat_nodes.get('Principled BSDF')
coords = coat_nodes.new('ShaderNodeTexCoord')
noise = COAT.node_tree.nodes.new('ShaderNodeTexNoise')
noise.inputs['Scale'].default_value = 62
noise.inputs['Detail'].default_value = 2.5
noise.inputs['Roughness'].default_value = .72
coat_links.new(coords.outputs['Object'], noise.inputs['Vector'])
bump = COAT.node_tree.nodes.new('ShaderNodeBump')
bump.inputs['Strength'].default_value = .72
bump.inputs['Distance'].default_value = .032
COAT.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
COAT.node_tree.links.new(bump.outputs['Normal'], COAT.node_tree.nodes.get('Principled BSDF').inputs['Normal'])
# Dense irregular grain, rather than a smooth satin finish or metallic glitter.
grain_color = coat_nodes.new('ShaderNodeValToRGB')
grain_color.color_ramp.elements[0].position = .2
grain_color.color_ramp.elements[0].color = (.003, .003, .003, 1)
grain_color.color_ramp.elements[1].position = .8
grain_color.color_ramp.elements[1].color = (.013, .013, .013, 1)
coat_links.new(noise.outputs['Fac'], grain_color.inputs['Fac'])
coat_links.new(grain_color.outputs['Color'], coat_bsdf.inputs['Base Color'])
roughness = coat_nodes.new('ShaderNodeMapRange')
roughness.inputs['From Min'].default_value = .2
roughness.inputs['From Max'].default_value = .8
roughness.inputs['To Min'].default_value = .38
roughness.inputs['To Max'].default_value = .65
coat_links.new(noise.outputs['Fac'], roughness.inputs['Value'])
coat_links.new(roughness.outputs['Result'], coat_bsdf.inputs['Roughness'])

def service_part(mat):
    part = box('Example flat mounting plate', (0, 0, .45), (5.9, 4.25, .18))
    # Matching through-cut geometry in each scene; finish is the only change.
    subtract(part, cylinder('Central opening', (.5, 0, .45), .91, 1))
    for x in (-2.37, 2.37):
        for y in (-1.56, 1.56):
            subtract(part, cylinder('Fixing hole', (x, y, .45), .17, 1))
    for y in (-.64, 0, .64):
        subtract(part, box('Slot middle', (-1.65, y, .45), (1, .18, 1)))
        for x in (-2.15, -1.15):
            subtract(part, cylinder('Slot end', (x, y, .45), .09, 1))
    finish(part, mat, .04)
    return part

scenes = []
for name, mat, filename in [('01 Uncoated part', STEEL, 'uncoated.jpg'), ('02 Powder-coated part', COAT, 'coated.jpg')]:
    sc = scene(name, size=(1200, 900), camera=(5.7, -8.4, 12), target=(0, 0, .35), ortho=8.0)
    sc.cycles.samples = 96
    service_part(mat)
    scenes.append((sc, filename))
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'services-visual.blend'))
for sc, filename in scenes:
    if '--coated-only' not in sys.argv or filename == 'coated.jpg':
        render(sc, filename)
