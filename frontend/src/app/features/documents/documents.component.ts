import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DOCUMENTS_REVIEWED_AT, DocumentTopic, REFERENCE_DOCUMENTS } from './documents.data';

@Component({
  selector: 'app-documents',
  imports: [FormsModule, MatButtonModule],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss',
})
export class DocumentsComponent {
  search = '';
  selectedTopic: DocumentTopic | '' = '';
  reviewedAt = DOCUMENTS_REVIEWED_AT;
  documents = REFERENCE_DOCUMENTS;
  topics: { id: DocumentTopic; name: string; description: string }[] = [
    { id: 'calculations', name: 'Cách tính chỉ số', description: 'BMI, năng lượng và cân nặng' },
    { id: 'food', name: 'Dữ liệu thực phẩm', description: 'Bảng thành phần và cách tra cứu' },
    { id: 'health', name: 'Chăm sóc sức khỏe', description: 'Ăn uống, vận động và nghỉ ngơi' },
  ];
  private normalized(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .trim();
  }
  get filteredDocuments() {
    const terms = this.normalized(this.search).split(/\s+/).filter(Boolean);
    return this.documents.filter((d) => {
      const text = this.normalized(
        [d.title, d.publisher, d.description, d.keywords, d.appUse || '', d.language].join(' '),
      );
      return (
        (!this.selectedTopic || d.topic === this.selectedTopic) &&
        terms.every((term) => text.includes(term))
      );
    });
  }
  topicName(topic: DocumentTopic) {
    return this.topics.find((t) => t.id === topic)?.name || '';
  }
  reset() {
    this.search = '';
    this.selectedTopic = '';
  }
}
