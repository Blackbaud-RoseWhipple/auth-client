import { BBOmnibarUserActivity } from './omnibar-user-activity';

import { BBCsrfXhr } from '../shared/csrf-xhr';
import { BBAuthNavigator } from '../shared/navigator';

const RENEW_URL = 'https://s21aidntoken00blkbapp01.nxt.blackbaud.com/session/renew';

describe('User activity', () => {
  let navigateSpy: jasmine.Spy;
  let requestSpy: jasmine.Spy;

  function moveMouse(clientX = 1, clientY = 1) {
    document.dispatchEvent(
      new MouseEvent(
        'mousemove',
        {
          clientX,
          clientY
        }
      )
    );
  }

  function pressKey() {
    document.dispatchEvent(new KeyboardEvent('keypress'));
  }

  function validateRenewCall() {
    expect(requestSpy).toHaveBeenCalledWith(
      RENEW_URL,
      {
        inactivity: 1
      }
    );
  }

  function refreshUserCallback() {
    //
  }

  beforeAll(() => {
    requestSpy = spyOn(BBCsrfXhr, 'request');
    navigateSpy = spyOn(BBAuthNavigator, 'navigate');
  });

  beforeEach(() => {
    requestSpy.calls.reset();
    navigateSpy.calls.reset();
    BBOmnibarUserActivity.MIN_RENEWAL_AGE = 20;
    BBOmnibarUserActivity.ACTIVITY_TIMER_INTERVAL = 10;
  });

  afterEach(() => {
    BBOmnibarUserActivity.stopTracking();
  });

  it('should renew the user\'s session as soon as activity starts to be tracked', () => {
    BBOmnibarUserActivity.startTracking(refreshUserCallback);

    validateRenewCall();
  });

  it('should renew the user\'s session when the user moves the mouse', (done) => {
    BBOmnibarUserActivity.startTracking(refreshUserCallback);

    requestSpy.calls.reset();

    setTimeout(() => {
      moveMouse();

      validateRenewCall();

      done();
    }, 30);
  });

  it('should renew the user\'s session when the user presses a key', (done) => {
    BBOmnibarUserActivity.startTracking(refreshUserCallback);

    requestSpy.calls.reset();

    setTimeout(() => {
      pressKey();

      validateRenewCall();

      done();
    }, 30);
  });

  it(
    'should not renew the user\'s session when the mouse move event has fired but the mouse did not actually move',
    (done) => {
      BBOmnibarUserActivity.startTracking(refreshUserCallback);

      setTimeout(() => {
        moveMouse();

        requestSpy.calls.reset();

        moveMouse();

        setTimeout(() => {
          expect(requestSpy).not.toHaveBeenCalled();
          done();
        }, 30);
      }, 30);
    }
  );

  it(
    'should not renew the user\'s session during activity if the minimum renewal time has not yet been reached',
    (done) => {
      BBOmnibarUserActivity.MIN_RENEWAL_AGE = 2000;

      BBOmnibarUserActivity.startTracking(refreshUserCallback);

      requestSpy.calls.reset();

      setTimeout(() => {
        moveMouse();

        expect(requestSpy).not.toHaveBeenCalled();

        done();
      }, 30);
    }
  );

  it(
    'should not start tracking again if tracking has already started',
    (done) => {
      BBOmnibarUserActivity.startTracking(refreshUserCallback);
      BBOmnibarUserActivity.startTracking(refreshUserCallback);

      requestSpy.calls.reset();

      setTimeout(() => {
        moveMouse();

        expect(requestSpy.calls.count()).toBe(1);

        done();
      }, 30);
    }
  );

  it('should stop tracking activity', (done) => {
    BBOmnibarUserActivity.startTracking(refreshUserCallback);
    BBOmnibarUserActivity.stopTracking();

    requestSpy.calls.reset();

    setTimeout(() => {
      moveMouse();
      pressKey();

      expect(requestSpy).not.toHaveBeenCalled();

      done();
    }, 30);
  });

  it('should log the user out if the user logs out in another browser tab', () => {
    BBOmnibarUserActivity.startTracking(refreshUserCallback);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          message: {
            sessionId: undefined
          },
          messageType: 'session_change'
        }),
        origin: BBOmnibarUserActivity.IDENTITY_SECURITY_TOKEN_SERVICE_ORIGIN
      })
    );

    expect(navigateSpy).toHaveBeenCalledWith(
      BBOmnibarUserActivity.IDENTITY_SECURITY_TOKEN_SERVICE_ORIGIN +
      '?redirectUrl=' +
      encodeURIComponent(location.href)
    );
  });

  it('should ignore unexpected event data without throwing an error', () => {
    BBOmnibarUserActivity.startTracking(refreshUserCallback);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: {
          foo: 'bar'
        },
        origin: BBOmnibarUserActivity.IDENTITY_SECURITY_TOKEN_SERVICE_ORIGIN
      })
    );

    window.dispatchEvent(
      new MessageEvent('message', {
        data: 'asdf',
        origin: BBOmnibarUserActivity.IDENTITY_SECURITY_TOKEN_SERVICE_ORIGIN
      })
    );

    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          messageType: 'foo'
        }),
        origin: BBOmnibarUserActivity.IDENTITY_SECURITY_TOKEN_SERVICE_ORIGIN
      })
    );
  });

  it('should call the specified callback when the current user\'s info changes' , () => {
    const refreshUserCallbackSpy = jasmine.createSpy('refreshUserCallback');

    BBOmnibarUserActivity.startTracking(refreshUserCallbackSpy);

    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          message: {
            refreshId: 'abc',
            sessionId: '123'
          },
          messageType: 'session_change'
        }),
        origin: BBOmnibarUserActivity.IDENTITY_SECURITY_TOKEN_SERVICE_ORIGIN
      })
    );

    expect(refreshUserCallbackSpy).not.toHaveBeenCalled();

    window.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          message: {
            refreshId: 'def',
            sessionId: '123'
          },
          messageType: 'session_change'
        }),
        origin: BBOmnibarUserActivity.IDENTITY_SECURITY_TOKEN_SERVICE_ORIGIN
      })
    );

    expect(refreshUserCallbackSpy).toHaveBeenCalled();
  });

});
