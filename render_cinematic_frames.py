"""Resume final image delivery from the saved scene without rebuilding geometry."""
import bpy
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent
scene=bpy.context.scene
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
scene.render.engine='CYCLES'
scene.cycles.samples=16
scene.cycles.use_denoising=True
scene.cycles.denoising_use_gpu=False
scene.render.use_persistent_data=True
prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='METAL'
prefs.get_devices()
for device in prefs.devices: device.use=device.type=='METAL'
scene.cycles.device='GPU'
# A subtle ghost panel preserves the machine envelope without clouding the view.
ghost=bpy.data.materials.get('See-through finisher cutaway')
if ghost:
    next(n for n in ghost.node_tree.nodes if n.type=='MIX_SHADER').inputs[0].default_value=.012
scene.frame_end=240
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'manufacturing-journey-cinematic.blend'))
if '--fast-test' in args:
    scene.render.engine='BLENDER_EEVEE'
    scene.eevee.taa_render_samples=128
    scene.eevee.use_raytracing=True
    batches=[('mobile',179,180)]
elif '--test' in args:
    batches=[('desktop',179,180),('mobile',179,180)]
else:
    batches=[('desktop',161,192),('mobile',1,240)]
for variant,start,end in batches:
    scene.render.resolution_x=640 if variant=='mobile' else 1280
    scene.render.resolution_y=800
    scene.render.resolution_percentage=100
    scene.camera.data.lens=30 if variant=='mobile' else 49
    scene.cycles.samples=12 if variant=='mobile' else 16
    folder=ROOT/'static/img/home/journey-film'/variant
    folder.mkdir(exist_ok=True)
    scene.frame_start=start; scene.frame_end=end
    scene.render.filepath=str(folder/'frame-')
    print(f'RENDERING {variant} {start}-{end}',flush=True)
    bpy.ops.render.render(animation=True)
print('FINAL FRAMES COMPLETE',flush=True)
