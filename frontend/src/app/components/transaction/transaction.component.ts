import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../shared/shared.module';
import { TransactionDetailsModule } from './transaction-details.module';
import { TonPageData } from '../../ton/ton-page-data';
import { TonTrace, TonTransaction, publicDetails, tonAmount, tonExecution, tonMessages, transactionWithTraceMessages, readableField } from '../../ton/transaction-view';

export type { Pool, TxAuditStatus } from '@interfaces/transaction-audit.interface';

interface TraceStep { transaction: TonTransaction; depth: number; parent?: string; message?: string; }

/** Native transaction page. Chain loading is inherited; the existing page owns its layout. */
@Component({
  selector: 'app-transaction',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule, TransactionDetailsModule],
  templateUrl: './transaction.component.html',
  styleUrls: ['./transaction.component.scss'],
})
export class TransactionComponent extends TonPageData {
  relatedLoading = { event: false, trace: false };
  relatedErrors = { event: false, trace: false };

  override endpoint(): string {
    return super.endpoint() + (this.page === 'tx' ? '?include=core' : '');
  }

  override load(): void {
    this.relatedLoading = { event: false, trace: false };
    this.relatedErrors = { event: false, trace: false };
    super.load();
  }

  override loadRelated(): void {
    super.loadRelated();
    if (this.page === 'tx') {
      this.loadTransactionRelated('event');
      this.loadTransactionRelated('trace');
    }
  }

  loadTransactionRelated(field: 'event' | 'trace'): void {
    if (this.relatedLoading[field] || !this.data) return;
    const generation = this.generation;
    this.relatedLoading[field] = true;
    this.relatedErrors[field] = false;
    this.requests.add(this.http.get<any>('/api/ton/tx/' + encodeURIComponent(this.id) + '/' + field).subscribe({
      next: value => {
        if (generation !== this.generation) return;
        this.data = { ...this.data, [field]: value };
        this.relatedLoading[field] = false;
        this.cdr.markForCheck();
      },
      error: () => {
        if (generation !== this.generation) return;
        this.relatedLoading[field] = false;
        this.relatedErrors[field] = true;
        this.cdr.markForCheck();
      },
    }));
  }

  isMobile = typeof window !== 'undefined' && window.innerWidth < 850;
  publicDetails = publicDetails;
  tonAmount = tonAmount;
  tonExecution = tonExecution;
  readonly phases = ['storage_phase', 'credit_phase', 'compute_phase', 'action_phase', 'bounce_phase'];
  private traceSource: TonTrace | null = null;
  private traceSteps: TraceStep[] = [];
  private transactionSource: TonTransaction | null = null;
  private transactionView: TonTransaction | null = null;

  get displayedTransaction(): TonTransaction {
    if (this.data !== this.transactionSource) {
      this.transactionSource = this.data;
      this.transactionView = transactionWithTraceMessages(this.data, this.data?.trace);
    }
    return this.transactionView;
  }

  @HostListener('window:resize') resize(): void { this.isMobile = window.innerWidth < 850; }

  phaseFields(phase: Record<string, unknown>): Array<{key: string; label: string; value: unknown; amount: ReturnType<typeof tonAmount>}> {
    return Object.entries(phase || {}).filter(([key]) => !key.startsWith('_')).map(([key, value]) => ({
      key, label: readableField(key), value: publicDetails(value),
      amount: ['gas_fees', 'total_fwd_fees', 'total_action_fees', 'storage_fees_collected', 'storage_fees_due', 'fees_collected', 'fees_due', 'total_fees', 'credit', 'msg_fees', 'fwd_fees'].includes(key) ? tonAmount(value) : null,
    }));
  }

  traceRows(root: TonTrace): TraceStep[] {
    if (root === this.traceSource) return this.traceSteps;
    this.traceSource = root;
    this.traceSteps = [];
    const visited = new Set<TonTrace>();
    const visit = (node: TonTrace, depth: number, parent?: string): void => {
      if (!node || visited.has(node)) return;
      visited.add(node);
      if (node.transaction?.hash) this.traceSteps.push({transaction: transactionWithTraceMessages(node.transaction, node), depth, parent, message: node.transaction.in_msg?.hash});
      for (const child of node.children || []) visit(child, depth + 1, node.transaction?.hash || parent);
    };
    visit(root, 0);
    return this.traceSteps;
  }

  readonly skeletonRows = [0, 1, 2];

  selectedMessageFound(): boolean { return tonMessages(this.displayedTransaction).some(message => message.hash === this.id); }
}
