import { TonDocItem } from './ton-docs-data';
import { translateTonDocs } from './ton-docs-es';
import { translateTonDocsFr } from './ton-docs-fr';
import { translateTonDocsGerman } from './ton-docs-de';
import { translateTonDocsPt } from './ton-docs-pt';
import { translateTonDocsItalian } from './ton-docs-it';
import { translateTonDocsRussian } from './ton-docs-ru';
import { translateTonDocsUkrainian } from './ton-docs-uk';
import { translateTonDocsDutch } from './ton-docs-nl';
import { translateTonDocsJapanese } from './ton-docs-ja';
import { translateTonDocsChinese } from './ton-docs-zh';
import { translateTonDocsKorean } from './ton-docs-ko';
import { translateTonDocsVietnamese } from './ton-docs-vi';

export function localizedTonDocs(items: TonDocItem[], locale: string): TonDocItem[] {
  const code = locale.toLowerCase().split('-')[0];
  return code === 'es' ? translateTonDocs(items, locale)
    : code === 'fr' ? translateTonDocsFr(items, locale)
    : code === 'de' ? translateTonDocsGerman(items, locale)
    : code === 'pt' ? translateTonDocsPt(items, locale)
    : code === 'it' ? translateTonDocsItalian(items, locale)
    : code === 'ru' ? translateTonDocsRussian(items, locale)
    : code === 'uk' ? translateTonDocsUkrainian(items, locale)
    : code === 'nl' ? translateTonDocsDutch(items, locale)
    : code === 'ja' ? translateTonDocsJapanese(items, locale)
    : code === 'zh' ? translateTonDocsChinese(items, locale)
    : code === 'ko' ? translateTonDocsKorean(items, locale)
    : code === 'vi' ? translateTonDocsVietnamese(items, locale) : items;
}
