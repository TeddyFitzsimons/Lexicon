import type {Quote as QuoteData} from '../lib/quotes';

/** Presentational quotation. Callers decide how long a quote lives (see pageQuote / pickQuote). */
export function Quote({quote,className=''}:{quote:QuoteData;className?:string}){
 return <figure className={`lx-quote ${className}`}><blockquote>“{quote.text}”</blockquote><figcaption>{quote.author}</figcaption></figure>;
}
