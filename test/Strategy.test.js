var chai = require('chai'),
    assert = chai.assert,
    YahooTokenStrategy = require('../'),
    fakeProfile = JSON.stringify(require('./fixtures/profile.json'));

describe('YahooTokenStrategy:init', function () {
    it('Should properly export Strategy constructor', function () {
        assert.equal(typeof YahooTokenStrategy, 'function');
        assert.equal(typeof YahooTokenStrategy.Strategy, 'function');
        assert.equal(YahooTokenStrategy, YahooTokenStrategy.Strategy);
    });

    it('Should properly initialize', function () {
        var strategy = new YahooTokenStrategy({
            clientID: '123',
            clientSecret: '123'
        }, function () {
        });

        assert.equal(strategy.name, 'yahoo-token');
        assert(strategy._oauth2._useAuthorizationHeaderForGET);
    });
});

describe('YahooTokenStrategy:authenticate', function () {
    describe('Authenticate without passReqToCallback', function () {
        var strategy;

        before(function () {
            strategy = new YahooTokenStrategy({
                clientID: '123',
                clientSecret: '123'
            }, function (accessToken, refreshToken, profile, next) {
                assert.equal(accessToken, 'access_token');
                assert.equal(refreshToken, 'refresh_token');
                assert.typeOf(profile, 'object');
                assert.typeOf(next, 'function');
                return next(null, profile, {info: 'foo'});
            });

            strategy._oauth2.get = function (url, accessToken, next) {
                next(null, fakeProfile, null);
            };
        });

        it('Should properly parse access_token', function (done) {
            chai.passport.use(strategy)
                .success(function (user, info) {
                    assert.typeOf(user, 'object');
                    assert.typeOf(info, 'object');
                    assert.deepEqual(info, {info: 'foo'});
                    done();
                })
                .req(function (req) {
                    req.headers = {
                        access_token: 'access_token',
                        refresh_token: 'refresh_token',
                        xoauth_yahoo_guid: 'xoauth_yahoo_guid'
                    }
                })
                .authenticate({});
        });

        it('Should properly call fail if access_token is not provided', function (done) {
            chai.passport.use(strategy)
                .fail(function (error) {
                    assert.typeOf(error, 'object');
                    assert.typeOf(error.message, 'string');
                    assert.equal(error.message, 'You should provide access_token and xoauth_yahoo_guid');
                    done();
                })
                .authenticate({});
        });
    });

    describe('Authenticate with passReqToCallback', function () {
        var strategy;

        before(function () {
            strategy = new YahooTokenStrategy({
                clientID: '123',
                clientSecret: '123',
                passReqToCallback: true
            }, function (req, accessToken, refreshToken, profile, next) {
                assert.typeOf(req, 'object');
                assert.equal(accessToken, 'access_token');
                assert.equal(refreshToken, 'refresh_token');
                assert.typeOf(profile, 'object');
                assert.typeOf(next, 'function');
                return next(null, profile, {info: 'foo'});
            });

            strategy._oauth2.get = function (url, accessToken, next) {
                next(null, fakeProfile, null);
            }
        });

        it('Should properly call _verify with req', function (done) {
            chai.passport.use(strategy)
                .success(function (user, info) {
                    assert.typeOf(user, 'object');
                    assert.typeOf(info, 'object');
                    assert.deepEqual(info, {info: 'foo'});
                    done();
                })
                .req(function (req) {
                    req.body = {
                        access_token: 'access_token',
                        refresh_token: 'refresh_token',
                        xoauth_yahoo_guid: 'xoauth_yahoo_guid'
                    }
                })
                .authenticate({});
        });
    });
});

describe('YahooTokenStrategy:userProfile', function () {
    it('Should properly fetch profile', function (done) {
        var strategy = new YahooTokenStrategy({
            clientID: '123',
            clientSecret: '123'
        }, function () {
        });

        strategy._oauth2.get = function (url, accessToken, next) {
            next(null, fakeProfile, null);
        };

        strategy.userProfile('accessToken', 'xoauth_yahoo_guid', function (error, profile) {
            if (error) return done(error);

            assert.equal(profile.provider, 'yahoo');
            assert.equal(profile.id, '12345');
            assert.equal(profile.displayName, 'Samantha Edgerton');
            assert.equal(profile.name.familyName, 'Edgerton');
            assert.equal(profile.name.givenName, 'Samantha');
            assert.equal(typeof profile.photos[0].value, 'string');
            assert.equal(typeof profile._raw, 'string');
            assert.equal(typeof profile._json, 'object');
            assert.equal(profile._json.id, '12345');

            done();
        });
    });

    it('Should properly handle exception on fetching profile', function (done) {
        var strategy = new YahooTokenStrategy({
            clientID: '123',
            clientSecret: '123'
        }, function () {
        });

        strategy._oauth2.get = function (url, accessToken, next) {
            next(null, 'not a JSON', null);
        };

        strategy.userProfile('accessToken', 'xoauth_yahoo_guid', function (error, profile) {
            assert(error instanceof SyntaxError);
            assert.equal(typeof profile, 'undefined');
            done();
        });
    });
});
