"""Cut It Out: deterministic, scroll-scrubbable manufacturing film.

Run with Blender --background --python build_cinematic_journey.py -- --proof
or --render desktop / --render mobile after reviewing the proof frames.
"""
import bpy
import math
import random
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
# Retain the already-reviewed quote interface and its reusable modelling helpers.
source = (ROOT / 'build_cut_it_out_journey.py').read_text()
exec(compile(source.split('# The same thin bracket wireframe')[0], str(ROOT / 'build_cut_it_out_journey.py'), 'exec'))
INTRO_NAMES={ob.name for ob in bpy.data.objects}
# A screen emits its interface; it should not look like raised, reflective tiles.
for name in ('ui_pale','ui_panel','ui_teal','ui_ink'):
    material=M[name]
    shader=material.node_tree.nodes.get('Principled BSDF')
    emission=material.node_tree.nodes.new('ShaderNodeEmission')
    emission.inputs['Color'].default_value=shader.inputs['Base Color'].default_value
    emission.inputs['Strength'].default_value=.8
    material.node_tree.links.new(emission.outputs[0],material.node_tree.nodes.get('Material Output').inputs['Surface'])
for material in M.values():
    for node in material.node_tree.nodes:
        if node.type=='BUMP': node.inputs['Distance'].default_value=.00015
ROOT = Path(ROOT)
OUT = ROOT / 'static/img/home/journey-film'
OUT.mkdir(exist_ok=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1280
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'JPEG'
scene.render.image_settings.quality = 85
scene.render.fps = 30
scene.frame_end = 240
scene.render.film_transparent = False
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.16, .19, .23, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .22
scene.eevee.taa_render_samples = 32

def mesh(name, verts, faces, material):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material)
    return ob

def prism(name, points, z0, z1, material):
    n = len(points)
    verts = [(x, y, z) for z in (z0, z1) for x, y in points]
    faces = [tuple(reversed(range(n))), tuple(range(n, n*2))]
    faces += [(i, (i+1)%n, (i+1)%n+n, i+n) for i in range(n)]
    return mesh(name, verts, faces, material)

def line(name, points, radius, material):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.bevel_depth = radius
    data.bevel_resolution = 2
    poly = data.splines.new('POLY')
    poly.points.add(len(points)-1)
    for p, co in zip(poly.points, points):
        p.co = (*co, 1)
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material)
    return ob

def rounded(w, h, r, count=12):
    points=[]
    for cx, cy, a in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
        for j in range(count):
            t=math.radians(a+j*90/(count-1))
            points.append((cx+r*math.cos(t),cy+r*math.sin(t)))
    return points

def circle(x, y, r, n=40):
    return [(x+r*math.cos(i*math.tau/n),y+r*math.sin(i*math.tau/n)) for i in range(n)]

def uniform(points, count):
    closed=points+[points[0]]
    lengths=[math.dist(a,b) for a,b in zip(closed,closed[1:])]
    perimeter=sum(lengths); result=[]; segment=0; passed=0
    for i in range(count):
        d=perimeter*i/count
        while segment<len(lengths)-1 and passed+lengths[segment]<d:
            passed+=lengths[segment]; segment+=1
        t=(d-passed)/max(lengths[segment],1e-8)
        a,b=closed[segment:segment+2]
        result.append((a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))
    return result

def visible(ob, start=1, end=241):
    for child in ob.children:
        visible(child,start,end)
    for f, state in [(1, start>1),(max(1,start-1),True),(start,False),(end,True)]:
        if start == 1 and f == 1: state=False
        ob.hide_render=state
        ob.keyframe_insert('hide_render',frame=f)

def bevel(ob, amount=.001, segments=3):
    mod=ob.modifiers.new('Machined edge catches light','BEVEL')
    mod.width=amount
    mod.segments=segments

def parent_keep(ob, parent):
    ob.parent=parent

def empty(name):
    ob=bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(ob)
    return ob

def metal(name, colour, rough, grain=False):
    m=mat(name,colour,.95,rough)
    nodes=m.node_tree.nodes
    shader=nodes.get('Principled BSDF')
    tex=nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value=180
    coord=nodes.new('ShaderNodeTexCoord')
    mapping=nodes.new('ShaderNodeVectorMath'); mapping.operation='MULTIPLY'
    mapping.inputs[1].default_value=(1,70,5) if grain else (1,1,1)
    m.node_tree.links.new(coord.outputs['Generated'],mapping.inputs[0])
    m.node_tree.links.new(mapping.outputs['Vector'],tex.inputs['Vector'])
    bump=nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.16
    bump.inputs['Distance'].default_value=.00008
    m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height'])
    m.node_tree.links.new(bump.outputs['Normal'],shader.inputs['Normal'])
    return m

steel=metal('Cold rolled sheet | subtle directional grain',(.19,.23,.27),.36,True)
clean=metal('Satin steel | freshly finished',(.34,.39,.44),.30,True)
copper=metal('Machined copper nozzle',(.60,.255,.10),.27)
alloy=metal('Anodised head housing',(.21,.24,.27),.29)
dark=mat('Graphite satin machinery',(.027,.036,.045),.55,.32)
ceramic=mat('White ceramic insulator',(.8,.78,.72),0,.25)
slatmat=metal('Oxidised steel support slats',(.13,.12,.11),.68)
rubber=mat('Fine textured conveyor rubber',(.033,.038,.04),0,.82,micro=True)
paper=mat('Natural kraft corrugated board',(.26,.13,.055),0,.92)
pn=paper.node_tree.nodes
noise=pn.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value=340
bump=pn.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=.22; bump.inputs['Distance'].default_value=.00018
paper.node_tree.links.new(noise.outputs['Fac'],bump.inputs['Height'])
paper.node_tree.links.new(bump.outputs['Normal'],pn.get('Principled BSDF').inputs['Normal'])
tape=mat('Translucent brown packing tape',(.36,.22,.10),0,.3)
labelmat=mat('Uncoated shipping label',(.91,.9,.86),0,.85)
glow=mat('Local white-hot molten pool',(1,.60,.16),.1,.3,emission=(1,.43,.06),strength=18)

# Clear old floor; keep upload scene, with realistic small bevels and timing.
for ob in list(bpy.data.objects):
    if ob.name.startswith(('Factory floor','Floor safety dash')):
        bpy.data.objects.remove(ob,do_unlink=True)
    elif ob.animation_data and ob.animation_data.action:
        action=ob.animation_data.action
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for p in fc.keyframe_points:
                            p.co.x=1+(p.co.x-1)*1.62

# All silhouettes are derived from this one part: 600 x 360 x 2 mm.
PROFILE=uniform(rounded(.60,.36,.045),96)
HOLES=[circle(x,y,.016) for x in (-.22,.22) for y in (-.105,.105)]
HOLES.append(uniform(rounded(.18,.045,.0225,16),64))
for outline in [PROFILE,*HOLES]:
    ob=line('DXF exact manufactured profile', [(-4.16+x*.85,-.526,1.64+y*.85) for x,y in outline+[outline[0]]], .002, M['ui_teal'])
    visible(ob,29,44)
# A cursor makes the upload action explicit.
cursor=mesh('Upload cursor',[(-4.72,-1.8,1.22),(-4.72,-1.8,1.12),(-4.69,-1.8,1.145),(-4.65,-1.8,1.10),(-4.635,-1.8,1.114),(-4.675,-1.8,1.16)],[(0,1,2,3,4,5)],labelmat)
key(cursor,1,loc=(0,0,0)); key(cursor,10,loc=(0,0,0)); key(cursor,22,loc=(.64,1.20,.32)); visible(cursor,1,25)

# The factory is restrained and lit like an industrial product photograph.
cube('Studio factory floor',(4,0,-.08),(13,6,.08),mat('Factory epoxy',(.085,.095,.105),.12,.54),.01)
for x in (-2.45,2.45):
    cube('Laser enclosure side',(x,0,1.30),(.08,1.10,.95),M['white'],.025)
cube('Laser lower chassis',(0,0,.30),(2.50,1.12,.30),dark,.035)
cube('Laser back panel',(0,1.12,1.30),(2.5,.06,.95),M['white'],.02)
roof=cube('Laser closed roof',(0,0,2.22),(2.5,1.12,.035),M['white'],.015)
front=[]
for x in (-1.68,1.68):
    front.append(cube('Front enclosure panel',(x,-1.12,1.34),(.78,.06,.91),M['white'],.025))
front.append(cube('Window lower fascia',(0,-1.12,.70),(.90,.06,.27),dark,.018))
front.append(cube('Window upper fascia',(0,-1.12,2.10),(.90,.06,.13),dark,.018))
glassmat=mat('Tinted safety window',(.17,.085,.025),.15,.15)
glass=glassmat.node_tree.nodes.get('Principled BSDF'); glass.inputs['Transmission Weight'].default_value=.55
front.append(cube('Closed laser safety window',(0,-1.12,1.46),(.90,.016,.43),glassmat,.01))
logo=decal('Cut It Out laser identity',(-1.63,-1.184,1.35),.84,.168)
front.append(logo)
for x in (-2.15,-1.24,1.24,2.15):
    front.append(cube('Precise panel joint',(x,-1.184,1.35),(.002,.001,.80),dark,.001))
for x in (-2.25,2.25):
    for z in (.63,2.05):
        front.append(cyl('Panel fastener',(x,-1.189,z),.005,.004,alloy,rot=(math.pi/2,0,0),vertices=12))
cube('HMI column',(2.66,-.72,1.00),(.07,.08,.8),dark,.015)
cube('HMI display',(2.66,-.81,1.76),(.25,.028,.17),dark,.018)
cube('HMI illuminated panel',(2.66,-.844,1.77),(.222,.002,.137),M['ui_teal'],.008)
ui_text('CUT IT OUT',(2.66,-.848,1.82),.045,labelmat)
ui_text('JOB 001 / READY',(2.66,-.848,1.72),.025,labelmat)
for ob in front+[roof]:
    # Interior is a film cut to a camera inside the closed machine.
    visible(ob,1,241)

# Sawtooth slats with thin steel thickness; sheet rests on their tips.
Z=.86
for i in range(35):
    x=-1.48+i*.087
    tooth=[(-.76,.69),(.76,.69),(.76,Z-.001)]
    for j in range(39):
        y=.76-j*.04
        tooth.extend([(y,Z-.001),(y-.02,Z-.036)])
    verts=[(x+d,y,z) for d in (-.0015,.0015) for y,z in tooth]
    n=len(tooth)
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
    mesh('Serrated sacrificial bed slat',verts,faces,slatmat)
for y in (-.82,.82):
    cube('Precision linear guide',(0,y,1.12),(1.66,.021,.022),alloy,.004)
    for x in [-1.5+j*.15 for j in range(21)]:
        cyl('Rail fixing',(x,y,1.145),.004,.003,dark,vertices=12)

stock=cube('3048 x 1524 x 2 mm sheet',(0,0,Z),(1.524,.762,.001),steel,0)
cut=prism('Outer stock opening tool',uniform(rounded(.6012,.3612,.0456),96),Z-.1,Z+.1,steel)
subtract(stock,cut,'Exact part opening plus cutting kerf'); bpy.data.objects.remove(cut,do_unlink=True)
part=prism('ONE PART | 600 x 360 x 2 mm',PROFILE,Z-.001,Z+.001,steel)
for outline in HOLES:
    cut=prism('Aperture cutter',outline,Z-.1,Z+.1,steel)
    subtract(part,cut,'Through-cut aperture'); bpy.data.objects.remove(cut,do_unlink=True)
bevel(part,.00015,2)
part.data.materials.append(clean)

# Segmented stock bridges disappear at the exact nozzle position, creating a real progressive kerf.
paths=[]
for h, outline in enumerate(HOLES):
    cx=sum(p[0] for p in outline)/len(outline); cy=sum(p[1] for p in outline)/len(outline)
    inner=[(cx+(x-cx)*.975,cy+(y-cy)*.975) for x,y in outline]
    slug=prism('Internal cutout slug',inner,Z-.001,Z+.001,steel)
    start=55+h*8; finish=start+6
    key(slug,finish,loc=(0,0,0)); key(slug,finish+3,loc=(0,0,-.22)); visible(slug,1,finish+4)
    paths.append((outline,inner,start,finish))
outer2=uniform(rounded(.6012,.3612,.0456),96)
paths.append((outer2,PROFILE,98,139))
cut_schedule=[]
for outer,inner,start,finish in paths:
    for i in range(len(outer)):
        j=(i+1)%len(outer)
        bridge=prism('Uncut kerf bridge',[inner[i],outer[i],outer[j],inner[j]],Z-.001,Z+.001,steel)
        f=start+(finish-start)*(i+1)/len(outer)
        visible(bridge,1,math.ceil(f))
        cut_schedule.append((f,((outer[j][0]+inner[j][0])/2,(outer[j][1]+inner[j][1])/2)))

# A compact, mounted fibre head: housing, ceramic, threaded copper taper and tiny nozzle orifice.
head=empty('Following Z carriage and cutting head')
head_parts=[]
head_parts.append(cyl('Round black optics housing | footage reference',(0,0,.205),.058,.185,dark,vertices=96))
head_parts.append(cyl('Bolted lower optics flange',(0,0,.113),.061,.012,dark,vertices=96))
head_parts.append(cyl('Black focus barrel',(0,0,.088),.040,.039,dark,vertices=96))
knurlmat=metal('Machined brass knurled collar',(.40,.32,.17),.36)
head_parts.append(cyl('Knurled focus collar',(0,0,.061),.036,.028,knurlmat,vertices=96))
for i in range(80):
    a=i*math.tau/80
    head_parts.append(line('Vertical knurled groove',[(.0362*math.cos(a),.0362*math.sin(a),.048),(.0362*math.cos(a),.0362*math.sin(a),.074)],.00028,dark))
head_parts.append(cyl('Ceramic nozzle holder',(0,0,.043),.028,.010,ceramic))
head_parts.append(cyl('Copper threaded collar',(0,0,.033),.028,.009,copper))
bpy.ops.mesh.primitive_cone_add(vertices=64,radius1=.004,radius2=.027,depth=.023,location=(0,0,.017))
cone=bpy.context.object; cone.name='Copper conical cutting nozzle'; cone.data.materials.append(copper); head_parts.append(cone)
head_parts.append(cyl('Dark nozzle orifice',(0,0,.0055),.0015,.0004,dark,vertices=32))
for z in (.030,.033,.036):
    head_parts.append(cyl('Fine collar machining',(0,0,z),.0283,.0007,copper))
for i in range(6):
    a=i*math.tau/6
    head_parts.append(cyl('Head flange fastener',(.052*math.cos(a),.052*math.sin(a),.105),.0035,.005,alloy,vertices=6))
head_parts.append(cyl('Optical fibre connector',(0,0,.35),.018,.06,alloy))
head_parts.append(line('Optical fibre service loop',[(0,0,.37),(.01,.03,.44),(.04,.12,.46),(.08,.22,.45)],.009,rubber))
head_parts.append(line('Assist gas hose',[(.046,0,.22),(.07,.03,.25),(.07,.15,.35)],.004,rubber))
for ob in head_parts:
    ob.location.z-=.0035
    parent_keep(ob,head)
gantry=cube('Moving gantry extrusion',(0,0,1.30),(.048,.86,.065),alloy,.009)
mount=cube('Carriage backplate',(0,.065,.22),(.065,.018,.14),dark,.006); mount.parent=head
for f,xy in cut_schedule:
    key(head,f,loc=(xy[0],xy[1],Z+.001))
    key(gantry,f,loc=(xy[0],0,1.30))
for outer,inner,start,finish in paths:
    xy=((outer[0][0]+inner[0][0])/2,(outer[0][1]+inner[0][1])/2)
    key(head,start-1.5,loc=(*xy,Z+.035))
    key(head,start,loc=(*xy,Z+.001))
key(head,1,loc=(-.65,.40,Z+.14)); key(head,50,loc=(-.65,.40,Z+.14))
key(head,142,loc=(.75,.55,Z+.20)); key(head,240,loc=(.75,.55,Z+.20))
pool=sphere('Tiny molten cutting point',(0,0,.001),.0017,glow); pool.parent=head
bpy.ops.object.light_add(type='POINT',location=(0,0,.007))
cut_light=bpy.context.object; cut_light.name='Local molten reflection'; cut_light.data.energy=.8
cut_light.data.color=(1,.36,.055); cut_light.data.shadow_soft_size=.003; cut_light.parent=head
for ob in [pool,cut_light]:
    visible(ob,55,140)
    for _,_,start,finish in paths:
        ob.hide_render=False; ob.keyframe_insert('hide_render',frame=start)
        ob.hide_render=True; ob.keyframe_insert('hide_render',frame=finish+.4)
random.seed(18)
for i in range(28):
    dx=random.uniform(-.035,.035); dy=random.uniform(-.035,.035)
    length=random.uniform(.006,.028)
    spark=line('Ejected molten particle',[(dx,dy,-.01-i*.006),(dx*1.06,dy*1.06,-.01-i*.006-length)],random.uniform(.00015,.00038),glow)
    spark.parent=head; visible(spark,55,140)
    for f in range(55,141,2):
        key(spark,f,loc=(random.uniform(-.01,.01),random.uniform(-.01,.01),random.uniform(-.02,.01)))
    for _,_,start,finish in paths:
        spark.hide_render=False; spark.keyframe_insert('hide_render',frame=start)
        spark.hide_render=True; spark.keyframe_insert('hide_render',frame=finish+.4)

# Lift is a simple visible handling tool, with no fictitious automated transfer line.
lift=empty('Part pickup handle')
for x in (-.19,.19):
    ob=cyl('Pickup contact',(x,0,.015),.028,.023,dark); ob.parent=lift
    ob=cyl('Pickup stem',(x,0,.063),.009,.07,alloy); ob.parent=lift
ob=cube('Pickup hand grip',(0,0,.10),(.23,.025,.018),dark,.01); ob.parent=lift
key(lift,142,loc=(0,0,Z+.26)); key(lift,147,loc=(0,0,Z+.001)); key(lift,157,loc=(0,0,Z+.20)); visible(lift,142,161)
key(part,1,loc=(0,0,0)); key(part,147,loc=(0,0,0)); key(part,157,loc=(0,0,.20)); key(part,160,loc=(0,0,.20))

# 22-series-inspired finishing: a moving conveyor, actual looped abrasive belt and hold-downs.
TX=6.0
ghost=mat('See-through finisher cutaway',(.24,.36,.42),.15,.42)
gn=ghost.node_tree.nodes; gl=ghost.node_tree.links
transparent=gn.new('ShaderNodeBsdfTransparent')
blend=gn.new('ShaderNodeMixShader'); blend.inputs[0].default_value=.012
gl.new(transparent.outputs[0],blend.inputs[1])
gl.new(gn.get('Principled BSDF').outputs[0],blend.inputs[2])
gl.new(blend.outputs[0],gn.get('Material Output').inputs['Surface'])
if hasattr(ghost,'surface_render_method'): ghost.surface_render_method='DITHERED'
for y in (-.60,.60):
    cube('Finisher translucent side panel',(TX,y,.93),(.90,.006,.93),ghost,.008)
    for x in (TX-.90,TX+.90):
        cube('Finisher structural corner',(x,y,.93),(.018,.023,.93),dark,.006)
cube('Finisher overhead cabinet',(TX,0,1.78),(.92,.66,.27),dark,.02)
cube('Finisher lower frame',(TX,0,.70),(.92,.65,.15),dark,.02)
cube('Finisher conveyor',(TX,0,1.00),(1.55,.49,.025),rubber,.012)
for i in range(42):
    ob=cube('Moving conveyor grip',(TX-1.50+i*.073,0,1.0255),(.001,.48,.0006),dark,0)
    key(ob,161,loc=ob.location); key(ob,192,loc=ob.location+Vector((.29,0,0)))
for x in (TX-.55,TX+.55):
    cyl('Hold down roller',(x,0,1.0725),.045,.96,rubber,rot=(math.pi/2,0,0))
    cyl('Extraction duct',(x,0,2.17),.09,.35,alloy)
for x in (TX-.28,):
    cyl('Abrasive contact drum',(x,0,1.156),.128,.94,rubber,rot=(math.pi/2,0,0),vertices=64)
    cyl('Abrasive upper drum',(x,0,1.56),.10,.94,alloy,rot=(math.pi/2,0,0),vertices=64)
    abrasive=mat('Abrasive grit',(.22,.13,.085),0,.9,micro=True)
    belt_points=[]
    for j in range(33):
        a=math.pi+j*math.pi/32
        belt_points.append((x+.129*math.cos(a),1.156+.129*math.sin(a)))
    for j in range(33):
        a=j*math.pi/32
        belt_points.append((x+.129*math.cos(a),1.56+.129*math.sin(a)))
    n=len(belt_points)
    mesh('Continuous wide abrasive belt',[(bx,y,bz) for y in (-.47,.47) for bx,bz in belt_points],[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],abrasive)
    # Moving grit texture conveys belt speed without floating geometry.
    texcoord=abrasive.node_tree.nodes.new('ShaderNodeTexCoord')
    mapping=abrasive.node_tree.nodes.new('ShaderNodeMapping')
    abrasive.node_tree.links.new(texcoord.outputs['Generated'],mapping.inputs['Vector'])
    noise=next(n for n in abrasive.node_tree.nodes if n.type=='TEX_NOISE')
    abrasive.node_tree.links.new(mapping.outputs['Vector'],noise.inputs['Vector'])
    mapping.inputs['Location'].default_value=(0,0,0); mapping.inputs['Location'].keyframe_insert('default_value',frame=161)
    mapping.inputs['Location'].default_value=(0,0,8); mapping.inputs['Location'].keyframe_insert('default_value',frame=192)
brushmat=mat('Non-woven finishing brush',(.055,.019,.012),0,.96,micro=True)
for node in brushmat.node_tree.nodes:
    if node.type=='BUMP': node.inputs['Distance'].default_value=.00045
    if node.type=='TEX_NOISE': node.inputs['Scale'].default_value=380
bn=brushmat.node_tree.nodes; bl=brushmat.node_tree.links
grain=next(n for n in bn if n.type=='TEX_NOISE')
tones=bn.new('ShaderNodeValToRGB')
tones.color_ramp.elements[0].position=.2; tones.color_ramp.elements[0].color=(.012,.006,.003,1)
tones.color_ramp.elements[1].position=.8; tones.color_ramp.elements[1].color=(.105,.034,.014,1)
bl.new(grain.outputs['Fac'],tones.inputs[0]); bl.new(tones.outputs[0],bn.get('Principled BSDF').inputs['Base Color'])
# Dense, overlapping non-woven leaves, not a smooth solid cylinder. Fine broken
# tips and independently offset edges catch the inspection light as it rotates.
verts=[]; faces=[]
random.seed(47)
for leaf in range(192):
    start=len(verts)
    for ring in range(33):
        y=-.46+ring*.92/32+random.uniform(-.0006,.0006)
        for radial in range(4):
            radius=.068+radial*.021+random.uniform(-.0006,.0006)
            a=leaf*math.tau/192+radial*.042+math.sin(ring*.9+leaf)*.002
            verts.append((radius*math.cos(a),y,radius*math.sin(a)))
    for ring in range(32):
        for radial in range(3):
            a=start+ring*4+radial
            faces.append((a,a+1,a+5,a+4))
brush=mesh('Rotating finishing brush',verts,faces,brushmat); brush.location=(TX+.32,0,1.158)
key(brush,161,rot=(0,0,0)); key(brush,192,rot=(0,math.pi*15,0))
cyl('Finishing brush spindle',(TX+.32,0,1.158),.036,1.02,alloy,rot=(math.pi/2,0,0))
for y in (-.465,.465):
    cyl('Brush machined retaining hub',(TX+.32,y,1.158),.052,.018,alloy,rot=(math.pi/2,0,0),vertices=64)
    for j in range(6):
        a=j*math.tau/6
        cyl('Brush hub bolt',(TX+.32+.041*math.cos(a),y+(-.012 if y<0 else .012),1.158+.041*math.sin(a)),.004,.005,dark,rot=(math.pi/2,0,0),vertices=6)
decal('Cut It Out finisher logo',(TX,-.661,1.76),.70,.14)
cube('Finisher HMI',(TX+.92,-.73,1.60),(.19,.03,.14),dark,.012)
key(part,161,loc=(TX-1.10,0,1.027-Z)); key(part,192,loc=(TX+1.10,0,1.027-Z))
# A moving material boundary makes the finish appear where the abrasive passes.
nodes=steel.node_tree.nodes; links=steel.node_tree.links
shader=nodes.get('Principled BSDF')
coord=nodes.new('ShaderNodeTexCoord'); separate=nodes.new('ShaderNodeSeparateXYZ')
links.new(coord.outputs['Generated'],separate.inputs[0])
threshold=nodes.new('ShaderNodeMath'); threshold.operation='GREATER_THAN'
links.new(separate.outputs['X'],threshold.inputs[0])
threshold.inputs[1].default_value=2; threshold.inputs[1].keyframe_insert('default_value',frame=168)
threshold.inputs[1].default_value=-1; threshold.inputs[1].keyframe_insert('default_value',frame=179)
mix=nodes.new('ShaderNodeMixRGB'); mix.inputs[1].default_value=(.19,.23,.27,1); mix.inputs[2].default_value=(.34,.39,.44,1)
links.new(threshold.outputs[0],mix.inputs[0]); links.new(mix.outputs[0],shader.inputs['Base Color'])

# Packaging: real hollow 3 mm board, scored flaps, paper protection, tape and printed label.
PX=11.0
cube('Packing workbench',(PX,0,.67),(1.15,.72,.04),mat('Workbench oak',(.23,.14,.075),0,.65),.012)
base=.715; wall=.12; hw=.36; hh=.24; t=.003
carton=empty('Packed parcel assembly')
box_parts=[]
box_parts.append(cube('Carton bottom',(PX,0,base),(hw,hh,t/2),paper,.0004))
for y in (-hh,hh):
    box_parts.append(cube('Corrugated long wall',(PX,y,base+wall/2),(hw,t/2,wall/2),paper,.0004))
for x in (-hw,hw):
    box_parts.append(cube('Corrugated end wall',(PX+x,0,base+wall/2),(t/2,hh,wall/2),paper,.0004))
for y in (-hh,hh):
    for i in range(115):
        x=PX-hw+i*hw*2/114
        box_parts.append(line('Exposed corrugation flute',[(x,y-.001,base+wall),(x+.0015,y,base+wall-.001),(x+.003,y+.001,base+wall)],.00025,paper))
paperverts=[]; paperfaces=[]
for j in range(25):
    y=-.215+j*.43/24
    for i in range(49):
        x=-.335+i*.67/48
        wrinkle=.002*math.sin(i*.74+j*.39)+.001*math.sin(i*1.7-j*.8)
        edge=max(0,abs(x)-.30)*.12+max(0,abs(y)-.18)*.12
        paperverts.append((PX+x,y,base+.020+wrinkle+edge))
for j in range(24):
    for i in range(48):
        a=j*49+i; paperfaces.append((a,a+1,a+50,a+49))
wrap=mesh('Wrinkled protective kraft liner',paperverts,paperfaces,paper)
solid=wrap.modifiers.new('Actual paper thickness','SOLIDIFY'); solid.thickness=.0003
box_parts.append(wrap)
flaps=[]
for y,sign in [(-hh,-1),(hh,1)]:
    rig=empty('Long carton flap fold'); rig.location=(PX,y,base+wall)
    ob=cube('Thin long folding flap',(0,sign*hh/2,0),(hw,hh/2,t/2),paper,.0004); ob.parent=rig
    key(rig,195,rot=(sign*math.radians(18),0,0)); key(rig,219,rot=(sign*math.radians(18),0,0)); key(rig,228,rot=(sign*math.pi,0,0))
    flaps.append(rig)
for x,sign in [(-hw,-1),(hw,1)]:
    rig=empty('Short carton flap fold'); rig.location=(PX+x,0,base+wall-.003)
    ob=cube('Thin end folding flap',(sign*.10,0,0),(.10,hh,t/2),paper,.0004); ob.parent=rig
    key(rig,195,rot=(0,-sign*math.radians(22),0)); key(rig,211,rot=(0,-sign*math.radians(22),0)); key(rig,220,rot=(0,-sign*math.pi,0))
    flaps.append(rig)
seal=cube('Tape across closed seam',(PX,0,base+wall+.003),(hw+.002,.026,.00015),tape,.0002); visible(seal,230); box_parts.append(seal)
for x in (-hw,hw):
    ob=cube('Tape folded over box edge',(PX+x,0,base+wall-.027),(.00015,.026,.027),tape,.0001); visible(ob,230); box_parts.append(ob)
shipping=cube('Paper shipping label',(PX+.08,.10,base+wall+.004),(.13,.074,.0002),labelmat,.001); visible(shipping,232); box_parts.append(shipping)
ob=decal('Cut It Out label',(PX+.08,.126,base+wall+.0044),.19,.038,rot=(0,0,0)); visible(ob,232); box_parts.append(ob)
for i in range(45):
    ob=cube('Printed parcel barcode',(PX-.025+i*.0045,.07,base+wall+.0045),(.0007 if i%3 else .0014,.016,.00004),dark,0); visible(ob,232); box_parts.append(ob)
for ob in box_parts+flaps: ob.parent=carton
key(part,193,loc=(PX,0,base+.30-Z)); key(part,204,loc=(PX,0,base+.024-Z)); key(part,225,loc=(PX,0,base+.024-Z))
visible(part,1,228)
key(carton,234,loc=(0,0,0)); key(carton,240,loc=(.25,0,0))

# Film language: stable horizons, three intentional cuts, generous reading holds.
bpy.ops.object.camera_add()
cam=bpy.context.object; cam.name='Cinematic scroll camera'; scene.camera=cam; cam.data.lens=49
cam.data.clip_start=.005; cam.data.clip_end=100
SHOTS=[
 (1,(-4.10,-5.6,2.45),(-4.10,-.60,1.5)),(24,(-4.10,-4.7,2.22),(-4.10,-.46,1.65)),(39,(-4.10,-4.35,2.13),(-4.10,-.46,1.65)),
 (40,(-5.9,-6.6,3.7),(0,0,1.0)),(50,(-2.5,-3.7,2.05),(0,-.15,1.10)),
 (51,(-.74,-.92,1.49),(0,0,.96)),(94,(-.65,-.80,1.37),(0,0,.91)),
 (95,(-.49,-.60,1.17),(0,0,.89)),(139,(-.42,-.57,1.13),(.04,0,.88)),
 (140,(-.70,-.9,1.47),(0,0,.89)),(160,(-.65,-.95,1.52),(0,0,1.05)),
 (161,(4.15,-2.20,1.80),(5.65,0,1.14)),(168,(4.85,-1.24,1.40),(5.75,0,1.08)),
 (169,(5.14,-.90,1.32),(5.90,0,1.08)),(192,(6.35,-1.06,1.40),(6.85,0,1.06)),
 (193,(9.95,-1.35,1.70),(11,0,.84)),(218,(10.10,-1.15,1.61),(11,0,.79)),(240,(10.35,-1.38,1.57),(11.18,0,.80))]
for frame,loc,target in SHOTS: camera_key(cam,frame,loc,target)
for f,xy in cut_schedule:
    if f>=98:
        camera_key(cam,f,(xy[0]-.28,xy[1]-.39,Z+.24),(xy[0]+.01,xy[1]+.015,Z+.075))

def area(name, loc, target, power, size, colour=(1,.95,.88)):
    bpy.ops.object.light_add(type='AREA',location=loc)
    ob=bpy.context.object; ob.name=name; ob.data.energy=power; ob.data.shape='DISK'; ob.data.size=size; ob.data.color=colour; look(ob,target)
    return ob
area('Laptop softbox',(-4,-2,4),(-4,0,1.4),170,3)
area('Factory soft ceiling',(-1,-3,6),(0,0,1),1800,5)
area('Laser interior strip',(0,.25,1.96),(0,0,.86),70,1.4,(.79,.87,1))
area('Head copper edge light',(-.40,-.60,1.70),(0,0,.90),45,.65)
area('Sheet long reflection',(0,.65,1.55),(0,0,.86),55,1.0,(.8,.9,1))
area('Finisher main softbox',(5,-3,4),(6,0,1),950,3)
area('Finisher internal inspection',(5.9,-.35,1.45),(6,0,1.03),28,.5,(.85,.91,1))
area('Packing daylight',(10,-2,3.5),(11,0,.8),240,2.5)
area('Packing rim',(12.5,1,2.4),(11,0,.8),150,1.4)

# These repeated details move together. Joining them preserves the geometry while
# avoiding hundreds of separate render acceleration structures each frame.
for prefix in ('Vertical knurled groove','Exposed corrugation flute','Rail fixing','Printed parcel barcode','Serrated sacrificial bed slat'):
    group=[ob for ob in bpy.data.objects if ob.name.startswith(prefix)]
    if len(group)>1:
        bpy.ops.object.select_all(action='DESELECT')
        for ob in group: ob.select_set(True)
        bpy.context.view_layer.objects.active=group[0]
        bpy.ops.object.join()

# Keep unrelated stations out of the laptop composition.
scene.frame_set(40)
for ob in list(bpy.data.objects):
    if ob.type not in {'MESH','CURVE','FONT'}: continue
    if ob.name in INTRO_NAMES or ob.name.startswith(('DXF exact','Upload cursor')):
        if ob.name in INTRO_NAMES:
            ob.hide_render=False; ob.keyframe_insert('hide_render',frame=1)
        ob.hide_render=True; ob.keyframe_insert('hide_render',frame=40)
    elif not ob.name.startswith('Studio factory floor'):
        state=ob.hide_render
        ob.hide_render=True; ob.keyframe_insert('hide_render',frame=1); ob.keyframe_insert('hide_render',frame=39)
        ob.hide_render=state; ob.keyframe_insert('hide_render',frame=40)
    if ob.type=='MESH' and ('nozzle' in ob.name.lower() or 'drum' in ob.name.lower() or 'barrel' in ob.name.lower()):
        for face in ob.data.polygons:
            if len(face.vertices)==4: face.use_smooth=True

# Linear mechanical motion, smooth camera interpolation with no unintended overshoot.
for ob in bpy.data.objects:
    if ob.animation_data and ob.animation_data.action:
        for layer in ob.animation_data.action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for p in fc.keyframe_points:
                            p.interpolation='CONSTANT' if fc.data_path=='hide_render' else 'LINEAR'

for f,title in [(1,'UPLOAD'),(40,'THE FIBRE LASER'),(55,'CUTTING'),(140,'RELEASE'),(161,'FINISHING'),(193,'PACKAGING')]:
    scene.timeline_markers.new(title,frame=f)
scene.frame_set(1)
if '--photoreal' in sys.argv:
    scene.render.engine='CYCLES'
    scene.cycles.samples=16
    scene.cycles.use_denoising=True
    if hasattr(scene.cycles,'denoising_use_gpu'): scene.cycles.denoising_use_gpu=False
    scene.cycles.adaptive_threshold=.06
    scene.cycles.max_bounces=5
    scene.cycles.diffuse_bounces=2
    scene.cycles.glossy_bounces=3
    scene.render.use_persistent_data=False
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='METAL'
    prefs.get_devices()
    for device in prefs.devices: device.use=device.type=='METAL'
    scene.cycles.device='GPU'
    print('RENDER DEVICES',[(d.name,d.type,d.use) for d in prefs.devices],flush=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'manufacturing-journey-cinematic.blend'))

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
if '--proof' in args:
    scene.render.resolution_percentage=75
    for frame in (20,45,77,120,155,179,204,240):
        scene.frame_set(frame); scene.render.filepath=str(OUT/f'proof-{frame:04d}.jpg'); bpy.ops.render.render(write_still=True)
elif '--deliver' in args or '--finish' in args or '--finish-brush' in args:
    first=161 if '--finish' in args else 1
    batches=[('desktop',161,192),('mobile',1,240)] if '--finish-brush' in args else [('desktop',first,240),('mobile',1,240)]
    for variant,start,end in batches:
        folder=OUT/variant; folder.mkdir(exist_ok=True)
        scene.frame_start=start; scene.frame_end=end
        scene.render.resolution_x=640 if variant=='mobile' else 1280
        scene.render.resolution_y=800
        cam.data.lens=30 if variant=='mobile' else 49
        scene.render.filepath=str(folder/'frame-')
        print(f'RENDERING {variant} {start}-{end}',flush=True)
        bpy.ops.render.render(animation=True)
elif '--render' in args:
    variant=args[args.index('--render')+1]
    folder=OUT/variant; folder.mkdir(exist_ok=True)
    if variant=='mobile':
        scene.render.resolution_x=640; scene.render.resolution_y=800; cam.data.lens=30
    if '--start' in args: scene.frame_start=int(args[args.index('--start')+1])
    if '--end' in args: scene.frame_end=int(args[args.index('--end')+1])
    scene.render.filepath=str(folder/'frame-')
    bpy.ops.render.render(animation=True)
print('CINEMATIC JOURNEY COMPLETE',flush=True)
