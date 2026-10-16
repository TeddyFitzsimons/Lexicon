import {definitionRows,type Sense} from '../lib/senses';
import {dictionaryUrl,labels,relations,type Relations} from '../lib/relations';
import '../definitions.css';

/**
 * A word's definitions in Merriam-Webster's shape: 1. / 2. a. b. / 3.
 * Every example carries the label of the definition it belongs to (1, 2a).
 */

/** Library table: each definition beside its examples. */
export function DefinitionPairs({senses}:{senses:Sense[]}){
 return <div className="meaning-list">{definitionRows(senses).map(row=><div className={`meaning-pair${row.isSub?' is-sub':''}${row.isHeading?' is-heading':''}`} key={row.key}>
  <div className="meaning-definition"><DefinitionLine row={row}/></div>
  <div className="meaning-examples">{row.isHeading?null:row.examples.length?row.examples.map((ex,j)=><p key={j}><span className="example-label" aria-label={`Example for definition ${row.label}`}>{row.label}</span>“{ex}”</p>):<span className="no-examples">No example added</span>}</div>
  <RelationLinks value={row}/>
 </div>)}</div>;
}

/** Flashcards: each definition with its examples directly beneath. */
export function DefinitionStack({senses}:{senses:Sense[]}){
 const rows=definitionRows(senses);
 const single=rows.length===1;
 return <div className="definition-stack">{rows.map(row=><div className={`definition-entry${row.isSub?' is-sub':''}`} key={row.key}>
  {single?<p>{row.definition}</p>:<DefinitionLine row={row}/>}
  {row.examples.map((ex,j)=><blockquote key={j}>{!single&&<span className="example-label">{row.label}</span>}“{ex}”</blockquote>)}
  <RelationLinks value={row}/>
 </div>)}</div>;
}

function DefinitionLine({row}:{row:ReturnType<typeof definitionRows>[number]}){
 return <div className="definition-line">
  <span className="sense-number">{row.number}</span>
  {row.isSub&&<span className="sense-letter">{row.letter}</span>}
  {row.definition&&<span className="definition-text">{row.definition}</span>}
 </div>;
}

/**
 * A definition's synonyms, antonyms and related forms, in that order, beneath its examples.
 * Empty kinds are left out. Each word opens its Merriam-Webster page (its custom link if it has one).
 */
export function RelationLinks({value,className='definition-relations'}:{value:Relations;className?:string}){
 const kinds=relations.filter(k=>value[k].length);
 if(!kinds.length)return null;
 return <div className={className}>{kinds.map(k=><p key={k}><span className="relation-label">{labels[k]}</span>{value[k].map((item,i)=><span key={i}>{i>0&&', '}<a href={dictionaryUrl(item)} target="_blank" rel="noopener noreferrer">{item.term}</a></span>)}</p>)}</div>;
}
