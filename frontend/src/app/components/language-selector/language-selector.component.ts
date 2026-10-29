import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { languages } from '@app/app.constants';
import { LanguageService } from '@app/services/language.service';

@Component({
  selector: 'app-language-selector',
  templateUrl: './language-selector.component.html',
  styleUrls: ['./language-selector.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LanguageSelectorComponent implements OnInit {
  languageForm: UntypedFormGroup;
  // Translated pages remain excluded from search indexing until reviewed.
  languages = languages.filter(language => ['en', 'es', 'fr', 'de', 'pt', 'it', 'ru', 'uk', 'nl', 'ja', 'zh', 'ko', 'vi'].includes(language.code));

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private formBuilder: UntypedFormBuilder,
    private languageService: LanguageService,
  ) { }

  ngOnInit() {
    this.languageForm = this.formBuilder.group({
      language: [this.languageService.getLanguage()]
    });
  }

  changeLanguage() {
    const newLang = this.languageForm.get('language').value;
    this.languageService.setLanguage(newLang);
    const rawUrlPath = this.languageService.stripLanguageFromUrl(null);
    this.document.location.href = ((newLang !== 'en' ? `/${newLang}` : '') + rawUrlPath || '/') + this.document.location.search + this.document.location.hash;
  }
}
