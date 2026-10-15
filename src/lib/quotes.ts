/** Quotations shown in place of filler copy. */
export type Quote={text:string;author:string};
export const quotes:Quote[]=[
 {text:'Words are, of course, the most powerful drug used by mankind.',author:'Rudyard Kipling'},
 {text:'The limits of my language mean the limits of my world.',author:'Ludwig Wittgenstein'},
 {text:'If thought corrupts language, language can also corrupt thought.',author:'George Orwell'},
 {text:'Language is only the instrument of science, and words are but the signs of ideas.',author:'Samuel Johnson'},
 {text:'Words are the sum of their histories.',author:'Richard Kenney'},
 {text:'The great enemy of clear language is insincerity.',author:'George Orwell'},
 {text:'Reading maketh a full man; conference a ready man; and writing an exact man.',author:'Francis Bacon'},
 {text:'Words are like leaves; and where they most abound, Much fruit of sense beneath is rarely found.',author:'Alexander Pope'},
 {text:'Language is fossil poetry.',author:'Ralph Waldo Emerson'},
 {text:'Anyone who knew the word slattern was worth cultivating as a friend.',author:'Alan Bradley'},
 {text:'We have too many high sounding words and too few actions that correspond with them.',author:'Abigail Adams'},
 {text:'One forgets words as one forgets names. One’s vocabulary needs constant fertilizing or it will die.',author:'Evelyn Waugh'},
 {text:'Each word was at first a stroke of genius.',author:'Ralph Waldo Emerson'},
 {text:'A vocabulary of truth and simplicity will be of service throughout your life.',author:'Winston Churchill'},
 {text:'A writer lives in awe of words, for they can be cruel or kind, and they can change their meanings right in front of you.',author:'John Steinbeck'},
 {text:'All you have to do is write one true sentence. Write the truest sentence that you know.',author:'Ernest Hemingway'},
];

/** Random quote, skipping the given quotes and anything else by their authors. */
export function pickQuote(avoid:Quote[]=[],random=Math.random):Quote{
 const pool=quotes.filter(q=>!avoid.some(a=>a.author===q.author));
 const from=pool.length?pool:quotes;
 return from[Math.floor(random()*from.length)];
}

let pinned:Quote|null=null;
/** The sidebar quote: chosen once per page load, so it only changes on refresh, never on tab switches. */
export function pageQuote():Quote{return pinned??=pickQuote()}
