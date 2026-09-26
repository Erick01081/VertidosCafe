export type Coffee = { id:string; name:string; roaster:string; variety:string; country:string; region:string; municipality:string; farm:string; producer:string; process:string; altitude:number|null; notes:string; photo_path:string|null; created_at:string };
export type Recipe = { coffeeGrams:number; ratio:number; bloomRatio:number; pours:number; water:number[] };
export type Brew = { id:string; coffee_id:string; brewed_at:string; recipe:Recipe; dripper:string; grind:string; temperature:number|null; total_time:string; flavor:string; aroma:string; body:string; extraction:string; change_next:string; details:string };
export const blankCoffee = ():Omit<Coffee,'id'|'created_at'> => ({name:'',roaster:'',variety:'',country:'',region:'',municipality:'',farm:'',producer:'',process:'',altitude:null,notes:'',photo_path:null});
export const initialRecipe = ():Recipe => makeRecipe(15,16,3,5);
export function makeRecipe(coffeeGrams:number, ratio:number, bloomRatio:number, pours:number):Recipe {
  const grams=Math.min(100,Math.max(.1,Number(coffeeGrams)||15));
  const bloomFactor=Math.min(4,Math.max(2,Number(bloomRatio)||3));
  const ratioFactor=Math.min(40,Math.max(bloomFactor,Number(ratio)||16));
  const total=grams*ratioFactor, bloom=grams*bloomFactor, rest=total-bloom, count=Math.min(12,Math.max(1,Math.round(Number(pours)||5)));
  const water=Array.from({length:count+1},(_,i)=>Number((i===0?bloom:bloom+rest*i/count).toFixed(8)));
  return {coffeeGrams:grams,ratio:ratioFactor,bloomRatio:bloomFactor,pours:count,water};
}
