import json
from PIL import Image, ImageDraw
items=json.load(open('road-topology.json'));tex=Image.open('audit-texture-0.png').convert('RGB')
im=Image.new('RGB',(1400,1200),'#101b2a');d=ImageDraw.Draw(im)
for m in items:
 u,v=m['uv'];color=tex.getpixel((int(u*(tex.width-1)),int(v*(tex.height-1))))
 for tri in m['triangles']:
  points=[((p[0]+290)*2.3,(p[2]+240)*2.3) for p in tri];d.polygon(points,fill=color)
im.save('road-topology.png')
