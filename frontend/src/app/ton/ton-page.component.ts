import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { TonPageData } from './ton-page-data';

@Component({ selector: 'app-ton-page', standalone: true, imports: [CommonModule, RouterModule, SharedModule], templateUrl: './ton-page.component.html', styleUrls: ['./ton-page.component.scss'] })
export class TonPageComponent extends TonPageData {}
