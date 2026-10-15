import {letterFor,type Word} from '../lib/words';

/** Shared rendering for library and flashcard definitions, including example sentences. */
export function DefinitionList({word,kind}:{word:Pick<Word,'senses'>;kind:'library'|'study'}){
 return <div className={`hierarchy-list hierarchy-${kind}`}>
  {word.senses.map((sense,i)=><div className="hierarchy-primary" key={sense.id}>
   <div className="hierarchy-definition"><span className="hierarchy-label">{i+1}.</span>{sense.definition&&<span className="hierarchy-text">{sense.definition}</span>}</div>
   {sense.examples.filter(Boolean).map((ex,j)=><p className="hierarchy-example" key={j}><span className="hierarchy-example-label">{j+1}.</span> <span className="hierarchy-example-label">{letterFor(k)}.</span> “{ex}”</p>)}
   {sense.subdefinitions.map((sub,j)=><div className="hierarchy-subdefinition" key={sub.id}>
    <div className="hierarchy-definition"><span className="hierarchy-label">{letterFor(j)}.</span><span className="hierarchy-text">{sub.definition}</span></div>
    {sub.examples.filter(Boolean).map((ex,k)=><p className="hierarchy-example" key={k}>“{ex}”</p>)}
   </div>)}
  </div>)}
 </div>;
}
