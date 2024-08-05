import './style.css';

import {
  ColumnType,
  getChartContext,
  ChartToTSEvent,
} from '@thoughtspot/ts-chart-sdk';
import _ from 'lodash';
import Plotly from 'plotly.js-dist';

function getDataForColumn(column, dataArr) {
  // const idx = _.findIndex(dataArr.columns, colId => column.id === colId);
  // const data = _.map(dataArr.dataValue, row => row[idx]);

  const idx = _.findIndex(dataArr.columns, (colId) => column.id === colId);
  const data = _.map(dataArr.dataValue, (row) => row[idx]);
  return data;
}

const getDataModel = (chartModel) => {
  const columns = chartModel.columns;
  console.log('----------', chartModel);
  const dataArr = chartModel.data[0].data;

  // create projects from points & data
  // const data1 = getDataForColumn(columns[1], dataArr);
  // const data2 = getDataForColumn(columns[2], dataArr);
  const data1 = dataArr.dataValue;
  const data2 = dataArr.dataValue;

  return {
    data1,
    data2,
  };
};

async function render(ctx) {
  const chartModel = ctx.getChartModel();
  const measureColumns = _.filter(
    chartModel.columns,
    (col) => col.type === ColumnType.MEASURE
  );
  // const dataArr = chartModel.data?.[0]?.data ;
  const dataArr = getDataModel(chartModel);

  console.log('dataArr:', dataArr);
  // console.log('--- Column_data:', getDataForColumn(measureColumns[0], dataArr) )

  console.log('Inside render function.');
  // THE CHART
  var trace1 = {
    y: dataArr['data2'],
    name: measureColumns[0].name,
    type: 'box',
  };

  var trace2 = {
    y: dataArr['data1'],
    name: measureColumns[1].name,
    type: 'box',
  };

  var data = [trace1, trace2];

  Plotly.newPlot('app', data);
}

const renderChart = (ctx) => {
  try {
    console.log('Inside renderChart');
    ctx.emitEvent(ChartToTSEvent.RenderStart);
    render(ctx);
  } catch (e) {
    ctx.emitEvent(ChartToTSEvent.RenderError, {
      hasError: true,
      error: e,
    });
  } finally {
    ctx.emitEvent(ChartToTSEvent.RenderComplete);
  }
};

const init = async () => {
  const ctx = await getChartContext({
    getDefaultChartConfig: (chartModel) => {
      const cols = chartModel.columns;

      const measureColumns = _.filter(
        cols,
        (col) => col.type === ColumnType.MEASURE
      );

      const attributeColumns = _.filter(
        cols,
        (col) => col.type === ColumnType.ATTRIBUTE
      );

      const axisConfig = {
        key: 'column',
        dimensions: [
          {
            key: 'x',
            columns: [attributeColumns[0]],
          },
          {
            key: 'y',
            columns: measureColumns.slice(0, 2),
          },
        ],
      };
      return [axisConfig];
    },
    validateConfig: (updatedConfig, chartModel) => {
      if (updatedConfig.length <= 0) {
        return {
          isValid: false,
          validationErrorMessage: ['Invalid config. no config found'],
        };
      }
      return {
        isValid: true,
      };
    },
    getQueriesFromChartConfig: (chartConfig) => {
      const queries = chartConfig.map((config) =>
        _.reduce(
          config.dimensions,
          (acc, dimension) => ({
            queryColumns: [...acc.queryColumns, ...dimension.columns],
          }),
          {
            queryColumns: [],
          }
        )
      );

      return queries;
    },
    renderChart: (ctx) => renderChart(ctx),
    chartConfigEditorDefinition: (currentChartConfig, ctx) => {
      debugger;
      const { config } = currentChartConfig;

      const yColumns = config?.chartConfig?.[0]?.dimensions.find(
        (dimension) => dimension.key === 'y' && dimension.columns
      );

      const configDefinition = [
        {
          key: 'column',
          label: 'Custom Column',
          descriptionText:
            'X Axis can only have attributes, Y Axis can only have measures, Color can only have attributes. ' +
            'Should have just 1 column in Y axis with colors columns.',
          columnSections: [
            {
              key: 'x',
              label: 'Custom X Axis',
              allowAttributeColumns: true,
              allowMeasureColumns: false,
              allowTimeSeriesColumns: true,
              maxColumnCount: 1,
            },
            {
              key: 'y',
              label: 'Custom Y Axis',
              allowAttributeColumns: false,
              allowMeasureColumns: true,
              allowTimeSeriesColumns: false,
            },
          ],
        },
      ];
      if (yColumns?.columns.length) {
        for (let i = 0; i < yColumns.columns.length; i++) {
          configDefinition[0].columnSections.push({
            key: `layers${i}`,
            label: `Measures layer${i}`,
            allowAttributeColumns: false,
            allowMeasureColumns: true,
            allowTimeSeriesColumns: false,
          });
        }
      }
      return configDefinition;
    },
  });
  renderChart(ctx);
};

init();
