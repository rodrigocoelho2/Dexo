import re,json,csv
def parse(fn):
    d={};cur=None
    for line in open(fn,encoding='utf-8'):
        m=re.match(r'^\t([a-z0-9]+): \{',line)
        if m: cur=m.group(1); d[cur]=None; continue
        m=re.match(r'^\t\tisNonstandard: (null|"(\w+)")',line)
        if m and cur: d[cur]=m.group(2)
    return d
if __name__=='__main__':
    za=parse('sd/za_formats-data.ts'); sv=parse('sd/formats-data.ts')
    sp={int(r['id']):r['identifier'] for r in csv.DictReader(open('csv/pokemon_species.csv'))}
    norm=lambda s:re.sub('[^a-z0-9]','',s)
    zaset=[i for i,n in sp.items() if norm(n) in za and za[norm(n)] is None]
    lum=set(int(r['species_id']) for r in csv.DictReader(open('csv/pokemon_dex_numbers.csv')) if r['pokedex_id']=='34')
    extra=[i for i in zaset if i not in lum]
    print(len(zaset),len(lum),len(extra)); print([sp[i] for i in extra])
    print('missing species norm in sv', [sp[i] for i in sp if norm(sp[i]) not in sv][:20])
    print(len([k for k,v in sv.items() if v is None]))
