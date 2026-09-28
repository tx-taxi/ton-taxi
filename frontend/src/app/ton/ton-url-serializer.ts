import { Injectable } from '@angular/core';
import { DefaultUrlSerializer, UrlTree } from '@angular/router';

/** TON's canonical block tuple is a path value, not an Angular auxiliary outlet. */
@Injectable()
export class TonUrlSerializer extends DefaultUrlSerializer {
  override parse(url: string): UrlTree {
    const normalized = url.replace(/(\/block\/)(\([^/?#]+\))(?=[?#]|$)/, (_match, prefix, tuple) => prefix + tuple.replace(/\(/g, '%28').replace(/\)/g, '%29'));
    return super.parse(normalized);
  }
}
