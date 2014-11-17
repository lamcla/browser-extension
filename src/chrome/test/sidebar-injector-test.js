describe('SidebarInjector', function () {
  'use strict';

  var assert = chai.assert;
  var SidebarInjector = h.SidebarInjector;
  var injector;
  var fakeChromeTabs;
  var fakeFileAccess;

  beforeEach(function () {
    fakeChromeTabs = {
      update: sinon.stub(),
      executeScript: sinon.stub()
    };
    fakeFileAccess = sinon.stub().yields(true);

    injector = new SidebarInjector(fakeChromeTabs, {
      isAllowedFileSchemeAccess: fakeFileAccess,
      extensionURL: sinon.spy(function (path) {
        return 'CRX_PATH' + path;
      })
    });
  });

  describe('.injectIntoTab', function () {
    beforeEach(function () {
      // Handle loading the config.
      fakeChromeTabs.executeScript.yields([]);
    });

    describe('when viewing a remote PDF', function () {
      it('injects hypothesis into the page', function (done) {
        var spy = fakeChromeTabs.update.yields({tab: 1});
        var url = 'http://example.com/foo.pdf';

        injector.injectIntoTab({id: 1, url: url}, function () {
          sinon.assert.calledWith(spy, 1, {
            url: 'CRX_PATH/content/web/viewer.html?file=' + encodeURIComponent(url)
          });
          done();
        });
      });
    });

    describe('when viewing an remote HTML page', function () {
      it('injects hypothesis into the page', function (done) {
        var spy = fakeChromeTabs.executeScript;
        var url = 'http://example.com/foo.html';

        injector.injectIntoTab({id: 1, url: url}, function () {
          sinon.assert.calledThrice(spy);
          sinon.assert.calledWith(spy, 1, {
            file: 'public/embed.js'
          });
          done();
        });
      });

      it('sets the global annotator variable to true', function (done) {
        var spy = fakeChromeTabs.executeScript;
        var url = 'http://example.com/foo.html';

        injector.injectIntoTab({id: 1, url: url}, function () {
          sinon.assert.calledThrice(spy);
          sinon.assert.calledWith(spy, 1, {
            code: 'window.annotator = true;'
          });
          done();
        });
      });
    });

    describe('when viewing a local PDF', function () {
      describe('when file access is enabled', function () {
        it('loads the PDFjs viewer', function () {
          var spy = fakeChromeTabs.update;
          var url = 'file://foo.pdf';

          injector.injectIntoTab({id: 1, url: url});
          sinon.assert.called(spy);
          sinon.assert.calledWith(spy, 1, {
            url: 'CRX_PATH/content/web/viewer.html?file=' + encodeURIComponent('file://foo.pdf')
          });
        });
      });

      describe('when file access is disabled', function (done) {
        beforeEach(function () {
          fakeFileAccess.yields(false);
        });

        it('returns an error', function (done) {
          var url = 'file://foo.pdf';

          injector.injectIntoTab({id: 1, url: url}, function (err) {
            assert.ok(err, 'An error was returned');
            done();
          });
        });
      });
    });

    describe('when viewing a local HTML file', function () {
      it('returns an error', function (done) {
        var url = 'file://foo.html';
        injector.injectIntoTab({id: 1, url: url}, function (err) {
          assert(err, 'An error was returned');
          done();
        });
      });
    });
  });

  describe('.removeFromTab', function () {
    describe('when viewing a PDF', function () {
      it('reverts the tab back to the original document', function () {
        var spy = fakeChromeTabs.update;
        var url = 'CRX_PATH/content/web/viewer.html?file=' + encodeURIComponent('http://example.com/foo.pdf');

        injector.removeFromTab({id: 1, url: url});
        sinon.assert.calledWith(spy, 1, {
          url: 'http://example.com/foo.pdf'
        });
      });
    });

    describe('when viewing an HTML page', function () {
      it('injects a destroy script into the page', function () {
        var spy = fakeChromeTabs.executeScript;
        injector.removeFromTab({id: 1, url: 'http://example.com/foo.html'});
        sinon.assert.calledWith(spy, 1, {
          code: sinon.match.string
        });
      });
    });
  });
});