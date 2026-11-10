import json,collections
from PIL import Image, ImageDraw
items=json.load(open('road-topology.json'));tex=Image.open('audit-texture-0.png').convert('RGB');groups=collections.defaultdict(list)
for m in items: groups[tuple(round(v,3) for v in m['uv'])].append(m)
groups=sorted(groups.items(),key=lambda x:-sum(len(m['triangles']) for m in x[1]))[:50]
im=Image.new('RGB',(1000,900),'#16202a');d=ImageDraw.Draw(im)
for i,(uv,ms) in enumerate(groups):
 x=i%10*100;y=i//10*180;u,v=uv
 tile=tex.crop((max(0,int((u-.04)*tex.width)),max(0,int((v-.04)*tex.height)),min(tex.width,int((u+.04)*tex.width)),min(tex.height,int((v+.04)*tex.height)))).resize((90,90))
 im.paste(tile,(x,y));d.text((x,y+95),f'{i}: {len(ms)} meshes',fill='white');d.text((x,y+113),f'{u}, {v}',fill='white')
im.save('atlas-road-tiles.png');json.dump([{'uv':uv,'names':[m['name'] for m in ms]} for uv,ms in groups],open('atlas-groups.json','w'))
