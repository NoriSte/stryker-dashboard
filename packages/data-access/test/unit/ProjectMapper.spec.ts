import { expect } from 'chai';
import TableServiceAsPromised, { Entity, EntityKey } from '../../src/TableServiceAsPromised';
import { Mock, mock } from '../helpers/mock';
import ProjectMapper from '../../src/ProjectMapper';
import Project from '../../src/models/Project';
import { TableQuery, TableService } from 'azure-storage';
import * as sinon from 'sinon';

describe('ProjectMapper', () => {

  let sut: ProjectMapper;
  let tableServiceMock: Mock<TableServiceAsPromised>;

  beforeEach(() => {
    tableServiceMock = sinon.stub(new TableServiceAsPromised(mock(TableService) as any));
    sut = new ProjectMapper(tableServiceMock as any);
  });

  it('should create table "Project" if createTableIfNotExists is called', async () => {
    tableServiceMock.createTableIfNotExists.resolves();
    await sut.createTableIfNotExists();
    expect(tableServiceMock.createTableIfNotExists).calledWith('Project');
  });

  it('should insert the given project if insertOrMergeEntity is called', async () => {
    const expected: Project = {
      owner: 'github/owner',
      name: 'name',
      enabled: true,
      apiKeyHash: 'apiKey'
    };
    tableServiceMock.insertOrMergeEntity.resolves();
    await sut.insertOrMergeEntity(expected);
    expect(tableServiceMock.insertOrMergeEntity).calledWith('Project', {
      PartitionKey: 'github;owner',
      RowKey: 'name',
      enabled: true,
      apiKeyHash: 'apiKey'
    });
    expect(expected.name).eq('name');
  });

  it('should return null if specific row key and partition key does not exist', async () => {
    const expectedQuery = new TableQuery()
      .where('PartitionKey eq ?', 'github;partKey')
      .and('RowKey eq ?', 'rowKey');
    const results: (Entity<{ enabled: boolean, apiKeyHash: string }> & EntityKey)[] = [];
    tableServiceMock.queryEntities.resolves({ entries: results });
    const actualProjects = await sut.select('github/partKey', 'rowKey');
    expect(tableServiceMock.queryEntities).calledWith('Project', expectedQuery);
    expect(actualProjects).null;
  });

  it('should return the first entity when select is called with a row key', async () => {
    const expectedQuery = new TableQuery()
      .where('PartitionKey eq ?', 'github;partKey')
      .and('RowKey eq ?', 'rowKey');
    const results: (Entity<{ enabled: boolean, apiKeyHash: string }> & EntityKey)[] = [{
      PartitionKey: { _: 'partKey', $: 'Edm.String' },
      RowKey: { _: 'rowKey', $: 'Edm.String' },
      apiKeyHash: { _: 'hash', $: 'string' },
      enabled: { _: true, $: 'string' }
    }, {
      PartitionKey: { _: 'partKey2', $: 'Edm.String' },
      RowKey: { _: 'rowKey2', $: 'Edm.String' },
      apiKeyHash: { _: 'hash2', $: 'string' },
      enabled: { _: false, $: 'string' }
    }];
    const expected: Project = { name: 'rowKey', owner: 'partKey', enabled: true, apiKeyHash: 'hash' };
    tableServiceMock.queryEntities.resolves({ entries: results });
    const actualProjects = await sut.select('github/partKey', 'rowKey');
    expect(tableServiceMock.queryEntities).calledWith('Project', expectedQuery);
    expect(actualProjects).deep.eq(expected);
  });

  it('should return the all entities when select is called without a row key', async () => {
    const expectedQuery = new TableQuery().where('PartitionKey eq ?', 'github;partKey');
    const results: (Entity<{ enabled: boolean, apiKeyHash: string }> & EntityKey)[] = [{
      PartitionKey: { _: 'partKey', $: 'Edm.String' },
      RowKey: { _: 'rowKey', $: 'Edm.String' },
      apiKeyHash: { _: 'hash', $: 'string' },
      enabled: { _: true, $: 'string' }
    }, {
      PartitionKey: { _: 'partKey2', $: 'Edm.String' },
      RowKey: { _: 'rowKey2', $: 'Edm.String' },
      apiKeyHash: { _: 'hash2', $: 'string' },
      enabled: { _: false, $: 'string' }
    }];
    const expected: Project[] = [
      { name: 'rowKey', owner: 'partKey', enabled: true, apiKeyHash: 'hash' },
      { name: 'rowKey2', owner: 'partKey2', enabled: false, apiKeyHash: 'hash2' }
    ];
    tableServiceMock.queryEntities.resolves({ entries: results });
    const actualProjects = await sut.select('github/partKey');
    expect(tableServiceMock.queryEntities).calledWith('Project', expectedQuery);
    expect(actualProjects).deep.eq(expected);
  });

});
