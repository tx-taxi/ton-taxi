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
