import json
from PIL import Image,ImageDraw
items=json.load(open('road-topology.json'));groups=json.load(open('atlas-groups.json'))
ids=[1,4,5,10,11,15,18,31,32,36,43,44]
names=set(n for i in ids for n in groups[i]['names'])
im=Image.open('road-topology.png');d=ImageDraw.Draw(im)
for m in items:
 if m['name'] not in names:continue
 for t in m['triangles']:d.polygon([((p[0]+290)*2.3,(p[2]+240)*2.3) for p in t],fill='#23e8e0')
im.save('selected-road.png')
json.dump(sorted(names),open('src/assets/rocky-road-meshes.json','w'),indent=2)
print(len(names))
