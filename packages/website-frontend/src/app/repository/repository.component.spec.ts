import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of } from 'rxjs';

import { RepositoryComponent } from './repository.component';
import { RepositoryService } from './repository.service';
import { EnableRepositoryResponse, Repository } from 'stryker-dashboard-website-contract';

describe('RepositoryComponent', () => {
  let mockRepo: Repository;
  let component: RepositoryComponent;
  let fixture: ComponentFixture<RepositoryComponent>;
  let compiledComponent: HTMLElement;

  class RepositoryServiceStub {
    public enableRepository(): Observable<EnableRepositoryResponse> {
      return of();
    }
  }

  beforeEach(async(() => {
    mockRepo = {
      slug: 'github/stryker-mutator/stryker-badge',
      origin: 'https://www.github.com',
      owner: 'stryker-mutator',
      name: 'stryker-badge',
      enabled: true
    };
    TestBed.configureTestingModule({
      declarations: [RepositoryComponent],
      imports: [NgbModule],
      providers: [
        { provide: RepositoryService, useClass: RepositoryServiceStub }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RepositoryComponent);
    component = fixture.debugElement.componentInstance;
    component.repo = mockRepo;
    fixture.detectChanges();
    compiledComponent = fixture.debugElement.nativeElement;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it(`should display the repository's slug`, () => {
    const div = <HTMLDivElement>compiledComponent.querySelector('div');
    expect(div.textContent).toContain('github/stryker-mutator/stryker-badge');
  });

});
