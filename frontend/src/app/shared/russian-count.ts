/** Russian cardinal forms for the TON counts shown in the native block strip. */
export function russianCountNoun(count: number, kind: 'transaction' | 'message'): string {
  const form = new Intl.PluralRules('ru').select(count);
  if (kind === 'transaction') return form === 'one' ? 'транзакция' : form === 'few' ? 'транзакции' : 'транзакций';
  return form === 'one' ? 'сообщение' : form === 'few' ? 'сообщения' : 'сообщений';
}

export function ukrainianCountNoun(count: number, kind: 'transaction' | 'message'): string {
  const form = new Intl.PluralRules('uk').select(count);
  if (kind === 'transaction') return form === 'one' ? 'транзакція' : form === 'few' ? 'транзакції' : 'транзакцій';
  return form === 'one' ? 'повідомлення' : form === 'few' ? 'повідомлення' : 'повідомлень';
}

export function polishCountNoun(count: number, kind: 'transaction' | 'message'): string {
  const form = new Intl.PluralRules('pl').select(count);
  if (kind === 'transaction') return form === 'one' ? 'transakcja' : form === 'few' ? 'transakcje' : 'transakcji';
  return form === 'one' ? 'wiadomość' : form === 'few' ? 'wiadomości' : 'wiadomości';
}

export function czechCountNoun(count: number, kind: 'transaction' | 'message' | 'byte' | 'second'): string {
  const form = new Intl.PluralRules('cs').select(count);
  if (kind === 'transaction') return form === 'other' ? 'transakcí' : 'transakce';
  if (kind === 'byte') return form === 'one' ? 'bajt' : form === 'few' ? 'bajty' : form === 'many' ? 'bajtu' : 'bajtů';
  if (kind === 'second') return form === 'one' ? 'sekunda' : form === 'few' || form === 'many' ? 'sekundy' : 'sekund';
  return form === 'one' ? 'zpráva' : form === 'other' ? 'zpráv' : 'zprávy';
}
