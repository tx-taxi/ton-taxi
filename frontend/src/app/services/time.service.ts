import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { DatePipe } from '@angular/common';
import { dates } from '@app/shared/i18n/dates';

const intervals = {
  year: 31536000,
  month: 2592000,
  week: 604800,
  day: 86400,
  hour: 3600,
  minute: 60,
  second: 1
};

const precisionThresholds = {
  year: 100,
  month: 18,
  week: 12,
  day: 31,
  hour: 48,
  minute: 90,
  second: 90
};

// Singular, paucal, plural, accusative singular and genitive singular.
const polishUnits: Record<string, [string, string, string, string, string]> = {
  year: ['rok', 'lata', 'lat', 'rok', 'roku'],
  month: ['miesiąc', 'miesiące', 'miesięcy', 'miesiąc', 'miesiąca'],
  week: ['tydzień', 'tygodnie', 'tygodni', 'tydzień', 'tygodnia'],
  day: ['dzień', 'dni', 'dni', 'dzień', 'dnia'],
  hour: ['godzina', 'godziny', 'godzin', 'godzinę', 'godziny'],
  minute: ['minuta', 'minuty', 'minut', 'minutę', 'minuty'],
  second: ['sekunda', 'sekundy', 'sekund', 'sekundę', 'sekundy'],
};

// nominative one/few, genitive plural/singular, accusative singular,
// instrumental singular/plural.
const czechUnits: Record<string, [string, string, string, string, string, string, string]> = {
  year: ['rok', 'roky', 'let', 'roku', 'rok', 'rokem', 'lety'],
  month: ['měsíc', 'měsíce', 'měsíců', 'měsíce', 'měsíc', 'měsícem', 'měsíci'],
  week: ['týden', 'týdny', 'týdnů', 'týdne', 'týden', 'týdnem', 'týdny'],
  day: ['den', 'dny', 'dní', 'dne', 'den', 'dnem', 'dny'],
  hour: ['hodina', 'hodiny', 'hodin', 'hodiny', 'hodinu', 'hodinou', 'hodinami'],
  minute: ['minuta', 'minuty', 'minut', 'minuty', 'minutu', 'minutou', 'minutami'],
  second: ['sekunda', 'sekundy', 'sekund', 'sekundy', 'sekundu', 'sekundou', 'sekundami'],
};

function czechDuration(kind: string, unit: string, amount: number): string | null {
  const forms = czechUnits[unit];
  if (!forms || !Number.isFinite(amount)) return null;
  const category = new Intl.PluralRules('cs').select(amount);
  const base = category === 'one' ? 0 : category === 'few' ? 1 : category === 'many' ? 3 : 2;
  const isPast = kind === 'since' || kind === 'before';
  const index = isPast ? (category === 'one' ? 5 : 6)
    : kind === 'within' ? (category === 'one' || category === 'many' ? 3 : 2)
    : ['until', 'span'].includes(kind) && category === 'one' ? 4 : base;
  const duration = `${amount.toLocaleString('cs')} ${forms[index]}`;
  switch (kind) {
    case 'since': case 'before': return `Před ${duration}`;
    case 'until': return `Za ~${duration}`;
    case 'within': return `Během ~${duration}`;
    case 'span': return `Za ${duration}`;
    default: return duration;
  }
}

function polishDuration(kind: string, unit: string, amount: number): string | null {
  const forms = polishUnits[unit];
  if (!forms || !Number.isFinite(amount)) return null;
  const category = new Intl.PluralRules('pl').select(amount);
  const index = category === 'one' ? 0 : category === 'few' ? 1 : category === 'many' ? 2 : 4;
  const noun = kind === 'within' ? forms[index === 0 || index === 4 ? 4 : 2]
    : ['since', 'until', 'span', 'before'].includes(kind) && index === 0 ? forms[3] : forms[index];
  const duration = `${amount.toLocaleString('pl')} ${noun}`;
  switch (kind) {
    case 'since': return `${duration} temu`;
    case 'until': return `Za ~${duration}`;
    case 'within': return `W ciągu ~${duration}`;
    case 'span': return `Za ${duration}`;
    case 'before': return `${duration} przed`;
    default: return duration;
  }
}

@Injectable({
  providedIn: 'root'
})
export class TimeService {
  private ukrainianRelative?: Intl.RelativeTimeFormat;
  private ukrainianUnits = new Map<string, Intl.NumberFormat>();

  constructor(private datePipe: DatePipe, @Inject(LOCALE_ID) private locale: string) {}

  calculate(
    time: number,
    kind: 'plain' | 'since' | 'until' | 'span' | 'before' | 'within',
    relative: boolean = false,
    precision: number = 0,
    minUnit: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second' = 'second',
    showTooltip: boolean = false,
    units: string[] = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'],
    dateString?: string,
    lowercaseStart: boolean = false,
    numUnits: number = 1,
    fractionDigits: number = 0,
  ): { text: string, tooltip: string } {
    if (time == null) {
      return { text: '', tooltip: '' };
    }

    let seconds: number;
    let tooltip: string = '';
    switch (kind) {
      case 'since':
        seconds = Math.floor((+new Date() - +new Date(dateString || time * 1000)) / 1000);
        tooltip = this.datePipe.transform(new Date(dateString || time * 1000), 'yyyy-MM-dd HH:mm') || '';
        break;
      case 'until':
      case 'within':
        seconds = (+new Date(time) - +new Date()) / 1000;
        tooltip = this.datePipe.transform(new Date(time), 'yyyy-MM-dd HH:mm') || '';
        break;
      default:
        seconds = Math.floor(time);
        tooltip = '';
    }

    if (!showTooltip || relative) {
      tooltip = '';
    }

    if (seconds < 1 && kind === 'span') {
      return { tooltip, text: $localize`:@@date-base.immediately:Immediately` };
    } else if (seconds < 60) {
      if (relative || kind === 'since') {
        if (lowercaseStart) {
          return { tooltip, text: $localize`:@@date-base.just-now:Just now`.charAt(0).toLowerCase() + $localize`:@@date-base.just-now:Just now`.slice(1) };
        }
        return { tooltip, text: $localize`:@@date-base.just-now:Just now` };
      } else if (kind === 'until' || kind === 'within') {
        seconds = 60;
      }
    }

    let counter: number;
    const result: string[] = [];
    let usedUnits = 0;
    for (const [index, unit] of units.entries()) {
      let precisionUnit = units[Math.min(units.length - 1, index + precision)];
      counter = Math.floor(seconds / intervals[unit]);
      const precisionCounter = Math.round(seconds / intervals[precisionUnit]);
      if (precisionCounter > precisionThresholds[precisionUnit]) {
        precisionUnit = unit;
      }
      if (units.indexOf(precisionUnit) === units.indexOf(minUnit)) {
        counter = Math.max(1, counter);
      }
      if (counter > 0) {
        let rounded;
        const roundFactor = Math.pow(10,fractionDigits || 0);
        if ((kind === 'until' || kind === 'within') && usedUnits < numUnits) {
          rounded = Math.floor((seconds / intervals[precisionUnit]) * roundFactor) / roundFactor;
        } else {
          rounded = Math.round((seconds / intervals[precisionUnit]) * roundFactor) / roundFactor;
        }
        if ((kind !== 'until' && kind !== 'within')|| numUnits === 1) {
          return { tooltip, text: this.formatTime(kind, precisionUnit, rounded) };
        } else {
          if (!usedUnits) {
            result.push(this.formatTime(kind, precisionUnit, rounded));
          } else {
            result.push(this.formatTime('', precisionUnit, rounded));
          }
          seconds -= (rounded * intervals[precisionUnit]);
          usedUnits++;
          if (usedUnits >= numUnits) {
            return { tooltip, text: result.join(', ') };
          }
        }
      }
    }
    return { tooltip, text: result.join(', ') };
  }

  private formatTime(kind, unit, number): string {
    if (/^cs(?:-|$)/i.test(this.locale)) {
      const localized = czechDuration(kind, unit, number);
      if (localized) return localized;
    }
    if (/^pl(?:-|$)/i.test(this.locale)) {
      const localized = polishDuration(kind, unit, number);
      if (localized) return localized;
    }
    // Ukrainian has three cardinal forms and an accusative form for time;
    // selecting English singular/plural strings produces incorrect durations.
    if (this.locale.toLowerCase().split('-')[0] === 'uk') {
      const relative = this.ukrainianRelative ||= new Intl.RelativeTimeFormat('uk', { numeric: 'always' });
      const futureParts = relative.formatToParts(number, unit);
      const future = futureParts.map((part) => part.value).join('');
      let marked = false;
      const approximate = futureParts.map((part) => {
        if (part.type !== 'integer' || marked) return part.value;
        marked = true;
        return `~${part.value}`;
      }).join('');
      if (kind === 'since') return relative.format(-number, unit);
      if (kind === 'until') return approximate;
      if (kind === 'within') return `не пізніше ніж ${approximate}`;
      if (kind === 'span') return future.charAt(0).toUpperCase() + future.slice(1);
      if (kind === 'before') return future.replace(/^через /, 'за ') + ' до';
      if (!this.ukrainianUnits.has(unit)) this.ukrainianUnits.set(unit, new Intl.NumberFormat('uk', { style: 'unit', unit, unitDisplay: 'long' }));
      return this.ukrainianUnits.get(unit).format(number);
    }
    const dateStrings = dates(number);
    switch (kind) {
      case 'since':
        if (number === 1) {
          switch (unit) { // singular (1 day)
            case 'year': return $localize`:@@time-since:${dateStrings.i18nYear}:DATE: ago`;
            case 'month': return $localize`:@@time-since:${dateStrings.i18nMonth}:DATE: ago`;
            case 'week': return $localize`:@@time-since:${dateStrings.i18nWeek}:DATE: ago`;
            case 'day': return $localize`:@@time-since:${dateStrings.i18nDay}:DATE: ago`;
            case 'hour': return $localize`:@@time-since:${dateStrings.i18nHour}:DATE: ago`;
            case 'minute': return $localize`:@@time-since:${dateStrings.i18nMinute}:DATE: ago`;
            case 'second': return $localize`:@@time-since:${dateStrings.i18nSecond}:DATE: ago`;
          }
        } else {
          switch (unit) { // plural (2 days)
            case 'year': return $localize`:@@time-since:${dateStrings.i18nYears}:DATE: ago`;
            case 'month': return $localize`:@@time-since:${dateStrings.i18nMonths}:DATE: ago`;
            case 'week': return $localize`:@@time-since:${dateStrings.i18nWeeks}:DATE: ago`;
            case 'day': return $localize`:@@time-since:${dateStrings.i18nDays}:DATE: ago`;
            case 'hour': return $localize`:@@time-since:${dateStrings.i18nHours}:DATE: ago`;
            case 'minute': return $localize`:@@time-since:${dateStrings.i18nMinutes}:DATE: ago`;
            case 'second': return $localize`:@@time-since:${dateStrings.i18nSeconds}:DATE: ago`;
          }
        }
        break;
      case 'until':
        if (number === 1) {
          switch (unit) { // singular (In ~1 day)
            case 'year': return $localize`:@@time-until:In ~${dateStrings.i18nYear}:DATE:`;
            case 'month': return $localize`:@@time-until:In ~${dateStrings.i18nMonth}:DATE:`;
            case 'week': return $localize`:@@time-until:In ~${dateStrings.i18nWeek}:DATE:`;
            case 'day': return $localize`:@@time-until:In ~${dateStrings.i18nDay}:DATE:`;
            case 'hour': return $localize`:@@time-until:In ~${dateStrings.i18nHour}:DATE:`;
            case 'minute': return $localize`:@@time-until:In ~${dateStrings.i18nMinute}:DATE:`;
            case 'second': return $localize`:@@time-until:In ~${dateStrings.i18nSecond}:DATE:`;
          }
        } else {
          switch (unit) { // plural (In ~2 days)
            case 'year': return $localize`:@@time-until:In ~${dateStrings.i18nYears}:DATE:`;
            case 'month': return $localize`:@@time-until:In ~${dateStrings.i18nMonths}:DATE:`;
            case 'week': return $localize`:@@time-until:In ~${dateStrings.i18nWeeks}:DATE:`;
            case 'day': return $localize`:@@time-until:In ~${dateStrings.i18nDays}:DATE:`;
            case 'hour': return $localize`:@@time-until:In ~${dateStrings.i18nHours}:DATE:`;
            case 'minute': return $localize`:@@time-until:In ~${dateStrings.i18nMinutes}:DATE:`;
            case 'second': return $localize`:@@time-until:In ~${dateStrings.i18nSeconds}:DATE:`;
          }
        }
        break;
      case 'within':
        if (number === 1) {
          switch (unit) { // singular (In ~1 day)
            case 'year': return $localize`:@@time-within:within ~${dateStrings.i18nYear}:DATE:`;
            case 'month': return $localize`:@@time-within:within ~${dateStrings.i18nMonth}:DATE:`;
            case 'week': return $localize`:@@time-within:within ~${dateStrings.i18nWeek}:DATE:`;
            case 'day': return $localize`:@@time-within:within ~${dateStrings.i18nDay}:DATE:`;
            case 'hour': return $localize`:@@time-within:within ~${dateStrings.i18nHour}:DATE:`;
            case 'minute': return $localize`:@@time-within:within ~${dateStrings.i18nMinute}:DATE:`;
            case 'second': return $localize`:@@time-within:within ~${dateStrings.i18nSecond}:DATE:`;
          }
        } else {
          switch (unit) { // plural (In ~2 days)
            case 'year': return $localize`:@@time-within:within ~${dateStrings.i18nYears}:DATE:`;
            case 'month': return $localize`:@@time-within:within ~${dateStrings.i18nMonths}:DATE:`;
            case 'week': return $localize`:@@time-within:within ~${dateStrings.i18nWeeks}:DATE:`;
            case 'day': return $localize`:@@time-within:within ~${dateStrings.i18nDays}:DATE:`;
            case 'hour': return $localize`:@@time-within:within ~${dateStrings.i18nHours}:DATE:`;
            case 'minute': return $localize`:@@time-within:within ~${dateStrings.i18nMinutes}:DATE:`;
            case 'second': return $localize`:@@time-within:within ~${dateStrings.i18nSeconds}:DATE:`;
          }
        }
        break;
      case 'span':
        if (number === 1) {
          switch (unit) { // singular (1 day)
            case 'year': return $localize`:@@time-span:After ${dateStrings.i18nYear}:DATE:`;
            case 'month': return $localize`:@@time-span:After ${dateStrings.i18nMonth}:DATE:`;
            case 'week': return $localize`:@@time-span:After ${dateStrings.i18nWeek}:DATE:`;
            case 'day': return $localize`:@@time-span:After ${dateStrings.i18nDay}:DATE:`;
            case 'hour': return $localize`:@@time-span:After ${dateStrings.i18nHour}:DATE:`;
            case 'minute': return $localize`:@@time-span:After ${dateStrings.i18nMinute}:DATE:`;
            case 'second': return $localize`:@@time-span:After ${dateStrings.i18nSecond}:DATE:`;
          }
        } else {
          switch (unit) { // plural (2 days)
            case 'year': return $localize`:@@time-span:After ${dateStrings.i18nYears}:DATE:`;
            case 'month': return $localize`:@@time-span:After ${dateStrings.i18nMonths}:DATE:`;
            case 'week': return $localize`:@@time-span:After ${dateStrings.i18nWeeks}:DATE:`;
            case 'day': return $localize`:@@time-span:After ${dateStrings.i18nDays}:DATE:`;
            case 'hour': return $localize`:@@time-span:After ${dateStrings.i18nHours}:DATE:`;
            case 'minute': return $localize`:@@time-span:After ${dateStrings.i18nMinutes}:DATE:`;
            case 'second': return $localize`:@@time-span:After ${dateStrings.i18nSeconds}:DATE:`;
          }
        }
        break;
      case 'before':
      if (number === 1) {
        switch (unit) { // singular (1 day)
          case 'year': return $localize`:@@time-before:${dateStrings.i18nYear}:DATE: before`;
          case 'month': return $localize`:@@time-before:${dateStrings.i18nMonth}:DATE: before`;
          case 'week': return $localize`:@@time-before:${dateStrings.i18nWeek}:DATE: before`;
          case 'day': return $localize`:@@time-before:${dateStrings.i18nDay}:DATE: before`;
          case 'hour': return $localize`:@@time-before:${dateStrings.i18nHour}:DATE: before`;
          case 'minute': return $localize`:@@time-before:${dateStrings.i18nMinute}:DATE: before`;
          case 'second': return $localize`:@@time-before:${dateStrings.i18nSecond}:DATE: before`;
        }
      } else {
        switch (unit) { // plural (2 days)
          case 'year': return $localize`:@@time-before:${dateStrings.i18nYears}:DATE: before`;
          case 'month': return $localize`:@@time-before:${dateStrings.i18nMonths}:DATE: before`;
          case 'week': return $localize`:@@time-before:${dateStrings.i18nWeeks}:DATE: before`;
          case 'day': return $localize`:@@time-before:${dateStrings.i18nDays}:DATE: before`;
          case 'hour': return $localize`:@@time-before:${dateStrings.i18nHours}:DATE: before`;
          case 'minute': return $localize`:@@time-before:${dateStrings.i18nMinutes}:DATE: before`;
          case 'second': return $localize`:@@time-before:${dateStrings.i18nSeconds}:DATE: before`;
        }
      }
      break;
      default:
        if (number === 1) {
          switch (unit) { // singular (1 day)
            case 'year': return dateStrings.i18nYear;
            case 'month': return dateStrings.i18nMonth;
            case 'week': return dateStrings.i18nWeek;
            case 'day': return dateStrings.i18nDay;
            case 'hour': return dateStrings.i18nHour;
            case 'minute': return dateStrings.i18nMinute;
            case 'second': return dateStrings.i18nSecond;
          }
        } else {
          switch (unit) { // plural (2 days)
            case 'year': return dateStrings.i18nYears;
            case 'month': return dateStrings.i18nMonths;
            case 'week': return dateStrings.i18nWeeks;
            case 'day': return dateStrings.i18nDays;
            case 'hour': return dateStrings.i18nHours;
            case 'minute': return dateStrings.i18nMinutes;
            case 'second': return dateStrings.i18nSeconds;
          }
        }
    }
    return '';
  }
}
