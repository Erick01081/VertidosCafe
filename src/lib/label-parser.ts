export type LabelSuggestions = Partial<Record<'name'|'roaster'|'variety'|'country'|'region'|'municipality'|'farm'|'producer'|'process'|'altitude'|'notes',string>>;

/** Turns OCR text into editable proposals. It only reuses words present in the label. */
export function proposeLabelData(text:string):LabelSuggestions {
  const clean=(s:string)=>s.replace(/[|¦]/g,' ').replace(/\s+/g,' ').replace(/^[\s:–—-]+|[\s:–—-]+$/g,'').trim();
  const lines=text.split(/\n+/).map(clean).filter(Boolean);
  const joined=lines.join(' ');
  const labeled=(re:RegExp)=>{const line=lines.find(x=>re.test(x));return line?clean(line.replace(re,'')):''};
  const out:LabelSuggestions={};
  const brand=lines.find(x=>/^.{2,45}\s+(?:caf[eé]|coffee)$/i.test(x))||'';
  out.roaster=labeled(/^(?:roaster|tostador|roastery|brand|marca)\s*[:–—-]?\s*/i)||brand;
  out.variety=labeled(/^(?:variety|variedad|cultivar)\s*[:–—-]?\s*/i);
  const varietyPattern=/\b(sudan\s+rume|red\s+bourbon|pink\s+bourbon|maragesha|pacamara|castillo|caturra|typica|gesha|geisha|sidra|tabi|chiroso|bourbon)\b/i;
  const varietyLine=lines.find(x=>varietyPattern.test(x)&&x.length<90)||'';
  if(!out.variety&&varietyLine)out.variety=clean(varietyLine.match(varietyPattern)?.[0]||'');
  const processPattern=/\b(washed|lavado|natural|anaerobic|anaer[oó]bic[oa]?|honey|miel|lactic|l[aá]ctic[oa]|carbonic|ferment(?:ed|ado|aci[oó]n))\b/i;
  out.process=labeled(/^(?:process|proceso|fermentation|fermentaci[oó]n)\s*[:–—-]?\s*/i);
  if(!out.process){const processLine=lines.find(x=>processPattern.test(x)&&x.length<100)||'';out.process=processLine?clean(processLine.replace(varietyPattern,'')):'';}
  out.producer=labeled(/^(?:producer|productor(?:a)?|grown by|cultivado por)\s*[:–—-]?\s*/i)||lines.find(x=>/^#\s*[\p{L}][\p{L}'’.-]+(?:\s+[\p{L}][\p{L}'’.-]+){1,3}$/u.test(x))?.replace(/^#\s*/,'')||'';
  out.farm=labeled(/^(?:farm|finca|estate|hacienda)\s*[:–—-]?\s*/i);
  if(!out.farm)out.farm=lines.find(x=>/^(?:altos? de\s+\S+|el\s+triunfo|el\s+boh[ií]o|[\p{L}]+\s+(?:farm|estate))$/iu.test(x)&&x!==out.producer)||'';
  const noteLine=lines.filter(x=>/^(?:tasting notes?|notas de cata|perfil|flavou?r)\s*[:–—-]?\s*/i.test(x))[0]||'';
  out.notes=noteLine?clean(noteLine.replace(/^(?:tasting notes?|notas de cata|perfil|flavou?r)\s*[:–—-]?\s*/i,'')):'';
  if(!out.notes)out.notes=lines.filter(x=>!/^\s*(?:variety|variedad|cultivar|process|proceso|producer|productor|farm|finca|origin|origen)\b/i.test(x)&&/(?:\bnotes?\b|\bperfil\b|\bfloral\b|\bfruity\b|\bafrutad[oa]\b|\bcacao\b|\bchocolate\b|\bcitrus\b|\bcereza\b|\bframbuesa\b|\blimoncillo\b|\btoronja\b|\bcardamomo\b|\bcanela\b|\ban[ií]s\b|\bbanana\b|\blicor\b|\bnips\b)/i.test(x)&&x.length<240)[0]||'';
  const altitude=joined.match(/\b((?:\d{1,2}[,.]\d{3})|\d{3,4})\s*(?:m\s*\.\s*s\s*\.\s*n\s*\.\s*m\.?|msnm|m\.s\.n\.m\.?|masl|meters above sea level)\b/i);
  out.altitude=altitude?.[1].replace(/[,.]/g,'')||'';
  const origin=labeled(/^(?:origin|origen|location|ubicaci[oó]n)\s*[:–—-]?\s*/i);
  const departments=['Norte de Santander','Valle del Cauca','San Andrés y Providencia','La Guajira','Bogotá D.C.','Amazonas','Antioquia','Arauca','Atlántico','Bogotá','Bolívar','Boyacá','Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca','Guainía','Guaviare','Huila','Magdalena','Meta','Nariño','Putumayo','Quindío','Risaralda','Santander','Sucre','Tolima','Vaupés','Vichada'];
  const originLines=origin?[origin]:lines.filter(x=>departments.some(d=>x.toLowerCase().includes(d.toLowerCase())));
  if(originLines.length){
    const parts=originLines[0].split(/[,/|·]+/).map(clean).filter(Boolean);
    const dept=departments.find(d=>parts.some(p=>p.toLowerCase().includes(d.toLowerCase())));
    if(dept){out.region=dept;const locality=parts.find(p=>p.toLowerCase()!==dept.toLowerCase()&&!/^colombia$/i.test(p));if(locality)out.municipality=locality;}
    else if(parts.length===1)out.region=parts[0];
    else if(parts.length===2){out.municipality=parts[0];out.region=parts[1];}
    else if(parts.length>2){out.municipality=parts[0];out.region=parts.at(-2);}
  }
  if(/\bcolombia\b/i.test(joined))out.country='Colombia';
  // Without a tagged origin, an unambiguous Colombian department still gives useful region data.
  if(!out.region){const dept=departments.find(d=>new RegExp(`\\b${d.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,'i').test(joined));if(dept)out.region=dept;}
  if(!out.producer){
    out.producer=lines.find(x=>/^#?\s*[\p{Lu}][\p{L}'’.-]+(?:\s+[\p{Lu}][\p{L}'’.-]+){1,2}$/u.test(x)&&x!==out.roaster&&x!==out.variety&&x!==varietyLine&&x!==out.farm&&x!==out.region&&x!==out.municipality)||'';
  }
  // Prefer the label's variety/process lockup as the coffee name; no name is guessed from an unknown line.
  if(varietyLine)out.name=clean(varietyLine.replace(/^(?:variety|variedad|cultivar)\s*[:–—-]?\s*/i,''));
  else out.name=labeled(/^(?:coffee|café|microlot|microlote|lot|lote)\s*[:–—-]?\s*/i);
  return out;
}
