import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';
import { AppComponent } from './app.component';
import { AuthService } from './core/services/auth.service';
import { ShellBootService } from './core/services/shell-boot.service';

describe('AppComponent', () => {
  const authServiceMock = {
    user$: of(null),
    isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false)
  };

  const shellBootMock = {
    bootstrapping$: new BehaviorSubject(false),
    isBootstrapping: false,
    begin: jasmine.createSpy('begin'),
    complete: jasmine.createSpy('complete')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: ShellBootService, useValue: shellBootMock }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    authServiceMock.isAuthenticated.calls.reset();
    authServiceMock.isAuthenticated.and.returnValue(false);
    shellBootMock.isBootstrapping = false;
    shellBootMock.bootstrapping$.next(false);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have title 'NovaBank'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('NovaBank');
  });

  it('should enable sticky nav for authenticated app routes', () => {
    authServiceMock.isAuthenticated.and.returnValue(true);
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance as any;

    app['syncChrome']('/dashboard');

    expect(app.hasStickyNav).toBeTrue();
  });
});
