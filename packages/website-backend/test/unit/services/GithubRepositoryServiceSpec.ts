import { dalFactory, githubFactory } from '../../helpers/producers';
import * as dal from 'stryker-dashboard-data-access';
import * as contract from 'stryker-dashboard-website-contract';
import * as github from '../../../src/github/models';
import GithubAgent, * as githubAgentModule from '../../../src/github/GithubAgent';
import GithubRepositoryService from '../../../src/services/GithubRepositoryService';
import { expect } from 'chai';
import { HTTPException } from 'ts-httpexceptions';
import sinon = require('sinon');

describe('GithubRepositoryService', () => {

  let githubAgentMock: sinon.SinonStubbedInstance<GithubAgent>;
  let repositoryMapperMock: sinon.SinonStubbedInstance<dal.ProjectMapper>;
  let dataAccessStub: { repositoryMapper: sinon.SinonStubbedInstance<dal.ProjectMapper> };
  let sut: GithubRepositoryService;

  beforeEach(() => {
    githubAgentMock = sinon.createStubInstance(GithubAgent);
    sinon.stub(githubAgentModule, 'default').returns(githubAgentMock);
    repositoryMapperMock = sinon.createStubInstance(dal.ProjectMapper);
    dataAccessStub = {
      repositoryMapper: repositoryMapperMock
    };
    sut = new GithubRepositoryService(dataAccessStub as any);
  });

  describe('getAllForOrganizations', () => {
    it('should list projects as repos from github with their enabled state', async () => {
      const repos: github.Repository[] = [
        githubFactory.repository({ name: 'project1', full_name: 'foobarOrg/project1' }),
        githubFactory.repository({ name: 'project2', full_name: 'foobarOrg/project2' }),
        githubFactory.repository({ name: 'project3', full_name: 'foobarOrg/project3' })
      ];
      const projectEntities: dal.Project[] = [
        dalFactory.repository({ name: 'project1', enabled: false }),
        dalFactory.repository({ name: 'project2', enabled: true }),
        dalFactory.repository({ name: 'project3', enabled: false })
      ];
      const expectedRepos: contract.Repository[] = [
        { enabled: false, name: 'project1', origin: 'github', slug: 'github.com/foobarOrg/project1', owner: 'foobar_login' },
        { enabled: true, name: 'project2', origin: 'github', slug: 'github.com/foobarOrg/project2', owner: 'foobar_login' },
        { enabled: false, name: 'project3', origin: 'github', slug: 'github.com/foobarOrg/project3', owner: 'foobar_login' }
      ];
      githubAgentMock.getOrganizationRepositories.resolves(repos);
      dataAccessStub.repositoryMapper.select.resolves(projectEntities);

      const actual = await sut.getAllForOrganization(githubFactory.authentication(), 'foobarOrg');
      expect(actual).deep.eq(expectedRepos);
    });

    it('should retrieve the correct data', async () => {
      githubAgentMock.getOrganizationRepositories.resolves([]);
      dataAccessStub.repositoryMapper.select.resolves([]);
      await sut.getAllForOrganization(githubFactory.authentication({ accessToken: '213ASDcs' }), 'foobarOrg');
      expect(githubAgentMock.getOrganizationRepositories).calledWith('foobarOrg');
      expect(dataAccessStub.repositoryMapper.select).calledWith('github.com/foobarOrg');
      expect(githubAgentModule.default).calledWithNew;
      expect(githubAgentModule.default).calledWith('213ASDcs');
    });

    it('should reject if database is unavailable', () => {
      dataAccessStub.repositoryMapper.select.rejects(new Error('database unavailable'));
      githubAgentMock.getOrganizationRepositories.resolves([]);
      return expect(sut.getAllForOrganization(githubFactory.authentication(), '')).rejectedWith('database unavailable');
    });

    it('should give internal server error when github is unavailable', () => {
      dataAccessStub.repositoryMapper.select.resolves([]);
      githubAgentMock.getOrganizationRepositories.rejects(new Error('github unavailable'));
      return expect(sut.getAllForOrganization(githubFactory.authentication(), '')).rejectedWith('github unavailable');
    });
  });

  describe('update', () => {
    it(`should not allow if user does not have "push" permission`, async () => {
      githubAgentMock.userHasPushAccess.resolves(false);
      try {
        await sut.update(githubFactory.authentication(), '', '', true);
        expect.fail('Should have thrown');
      } catch (err) {
        const httpError = err as HTTPException;
        expect(httpError.status).eq(401);
        expect(httpError.message)
          .eq(`Permission denied. foobar does not have enough permissions for resource / (was "push": false).`);
      }
    });

    it(`should allow if user has "push" permission`, async () => {
      githubAgentMock.userHasPushAccess.resolves(true);
      await sut.update(githubFactory.authentication(), 'owner', 'name', true);
      expect(dataAccessStub.repositoryMapper.insertOrMergeEntity).called;
    });

    it('should update the repository entity', async () => {
      githubAgentMock.userHasPushAccess.resolves(true);
      await sut.update(githubFactory.authentication(), 'owner', 'name', true, 'apiKeyHash');
      expect(dataAccessStub.repositoryMapper.insertOrMergeEntity).calledWith({
        apiKeyHash: 'apiKeyHash',
        enabled: true,
        name: 'name',
        owner: 'github.com/owner'
      });
    });
  });
});
