/* global describe, before, after, it */
/* eslint-disable no-unused-expressions */

// these are LIVE TESTS that deal with the actual database!
// as such, they are subject to some unpredictable behavior
// if the testing username actually becomes taken, the tests will fail to function
const request = require('supertest');
const session = require('supertest-session');
const chai = require('chai');
const app = require('../server/server');
const db = require('../server/models');

const { expect } = chai;
let testSession = session(app);
let authenticatedSession;

before(() => {
  testSession = session(app);
});

const newUser = {
  username: 'barf',
  password: 'sampson',
};

describe('signup', () => {
  before((done) => {
    testSession.post('/signup')
      .send(newUser)
      .set('Accept', 'application/json')
      .expect(200)
      .end((err) => {
        if (err) {
          return done(err);
        }
        authenticatedSession = testSession;
        return done();
      });
  });

  after((done) => {
    db.User.destroy({ where: { username: newUser.username } })
      .then(done)
      .catch(err => done(err));
  });

  it('should store a new user in the db with a hashed password', (done) => {
    db.User.findOne({ username: newUser.username })
      .then(foundUser => foundUser.checkPassword(newUser.password, foundUser.password))
      .then((isValidPass) => {
        expect(isValidPass).to.be.true;
        done();
      })
      .catch(err => done(err));
  });

  it('should redirect a user to / if their username is already taken', (done) => {
    request(app)
      .post('/signup')
      .send(newUser)
      .set('Accept', 'application/json')
      .expect(302)
      .expect('Location', '/signup')
      .end(done);
  });
  it('should assign a session object to the new user on signup', (done) => {
    authenticatedSession.cookies.find((cookie) => {
      expect(cookie).to.exist;
      return done();
    });
  });
});

describe('login', () => {
  before((done) => {
    request(app)
      .post('/signup')
      .send(newUser)
      .expect(200, done);
  });

  it('should redirect a user to /:username/profile on a successful login', (done) => {
    request(app)
      .post('/login')
      .send(newUser)
      .expect(302)
      .expect('Location', `/${newUser.username}/profile`, done);
  });

  it('should redirect a user to / on a failed login', (done) => {
    request(app)
      .post('/login')
      .send({
        username: 'blarney',
        password: 'bingleborfs',
      })
      .expect(302)
      .expect('Location', '/', done);
  });

  it('should associate a login with a new session', (done) => {
    testSession.post('/login')
      .send(newUser)
      .end((err) => {
        if (err) return done(err);
        authenticatedSession = testSession;
        return authenticatedSession.cookies.find((cookie) => {
          expect(cookie).to.exist;
          return done();
        });
      });
  });
});