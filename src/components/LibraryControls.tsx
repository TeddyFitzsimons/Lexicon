import {category,categoryOrder,type SortOrder} from '../lib/collection';
import type {Word} from '../lib/words';
import {Select} from './Select';
export const sortLabels:Record<SortOrder,string>={oldest:'Oldest first',newest:'Newest first',alphabetical:'Alphabetical (A–Z)'};

/** Part-of-speech filter and sort order, both on Lexicon's custom dropdown. */
export function LibraryControls({words,value,onChange,sort,onSort}:{words:Word[];value:string;onChange:(value:string)=>void;sort:SortOrder;onSort:(value:SortOrder)=>void}){
 const present=new Set(words.map(category));
 const categories=[...new Set([...categoryOrder,...present])].filter(p=>present.has(p));
 const filterOptions=[{value:'all',label:'All parts of speech',detail:words.length},{value:'grouped',label:'Grouped by part of speech',detail:words.length},...categories.map(p=>({value:p,label:p,detail:words.filter(w=>category(w)===p).length}))];
 return <div className="library-controls">
  <Select label="Part of speech" value={value} options={filterOptions} onChange={onChange} className="filter-select"/>
  <Select label="Sort words" value={sort} options={(Object.keys(sortLabels) as SortOrder[]).map(id=>({value:id,label:sortLabels[id]}))} onChange={onSort} className="sort-select"/>
 </div>;
}
