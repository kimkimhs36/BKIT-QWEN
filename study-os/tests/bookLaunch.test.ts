import { describe, expect, it } from 'vitest';
import { newBook } from '../src/books';
import { bookLaunch } from '../src/bookLaunch';
import { newState } from '../src/model';
import { addResource } from '../src/learningEngine';

describe('BKIT BOOKS authentic study launch', () => {
  it('opens an attached original PDF instead of its automatically generated blank problem', () => {
    const book = newBook('나의 미적분Ⅰ', '미적분Ⅰ');
    book.materials = [
      {id: 'link-pdf', kind: 'document', targetId: 'paper-001', chapterId: null},
    ];
    const result = bookLaunch(book, null, [{id: 'paper-001'}], {resources: []}, []);
    expect(result).toEqual({kind: 'document', documentId: 'paper-001', materialId: 'link-pdf'});
  });
  it('prefers an explicitly linked real question bank over an attached PDF', () => {
    const book = newBook('미적분Ⅰ', '미적분Ⅰ');
    book.materials = [
      {id: 'link-pdf', kind: 'document', targetId: 'paper-001', chapterId: null},
      {id: 'link-resource', kind: 'resource', targetId: 'resource-001', chapterId: null},
    ];
    const state = addResource(newState(), {
      title: '연습', subject: '미적분Ⅰ', sourceType: 'school-worksheet',
      linkedTaskId: null, linkedMediaIds: [],
    }, ['극한을 구하세요']);
    const realResource = state.learning!.resources.at(-1)!;
    book.materials[1].targetId = realResource.id;
    expect(bookLaunch(book, null, [{id: 'paper-001'}], state.learning!, []))
      .toEqual({kind: 'resource', resourceId: realResource.id});
  });
  it('does not open an unavailable or archived attachment', () => {
    const book = newBook('수학', '수학');
    book.materials = [{id: 'doc', kind: 'document', targetId: 'missing-file', chapterId: null}];
    expect(bookLaunch(book, null, [], {resources: []}, [])).toEqual({kind: 'timer'});
  });
  it('can start a linked unfinished task without a PDF or real problem', () => {
    const book = newBook('문학', '문학');
    book.materials = [{id: 'task-ref', kind: 'task', targetId: 'homework', chapterId: null}];
    const task = [{id:'homework',status:'todo' as const}];
    expect(bookLaunch(book, null, [], {resources: []}, task))
      .toEqual({kind: 'task',taskId:'homework'});
    expect(bookLaunch(book, null, [], {resources: []}, [{id:'homework',status:'done'}]))
      .toEqual({kind: 'timer'});
  });
  it('prioritizes the current chapter PDF before a book-wide document', () => {
    const book = newBook('물질과 에너지', '물질과 에너지');
    book.materials = [
      {id:'global',kind:'document',targetId:'chapter-general',chapterId:null},
      {id:'specific',kind:'document',targetId:'chapter-today',chapterId:'chapter-1'},
    ];
    expect(bookLaunch(book,'chapter-1',
      [{id:'chapter-general'},{id:'chapter-today'}],{resources:[]},[]))
      .toEqual({kind:'document',documentId:'chapter-today',materialId:'specific'});
  });
});
