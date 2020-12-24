import React, { useState, useEffect } from 'react';
import Layout from 'src/components/layout';
import SVGStat from 'src/components/SVGStat';
import YearsStat from 'src/components/YearsStat';
import LocationStat from 'src/components/LocationStat';
import RunTable from 'src/components/RunTable';
import RunMap from 'src/components/RunMap';
import { activities } from '../static/activities';
import {
  titleForShow,
  scrollToMap,
  locationForRun,
  geoJsonForRuns,
  titleForRun,
  filterCityRuns,
  filterYearRuns,
  filterTitleRuns,
  filterAndSortRuns,
  sortDateFunc,
  getBoundsForGeoData,
} from '../utils/utils';
import { IS_CHINESE } from '../utils/const';

const cities = {};
const runPeriod = {};
let provinces = [];
let countries = [];
let yearsArr = [];

// generate base attr
((runs) => {
  const locationsList = [];
  runs.forEach((run) => {
    const location = locationForRun(run);
    const periodName = titleForRun(run);
    if (periodName) {
      runPeriod[periodName] =
        runPeriod[periodName] === undefined ? 1 : runPeriod[periodName] + 1;
    }
    locationsList.push(location);
    const { city, province, country } = location;
    // drop only one char city
    if (city.length > 1) {
      cities[city] =
        cities[city] === undefined ? run.distance : cities[city] + run.distance;
    }
    if (province) {
      provinces.push(province);
    }
    if (country) {
      countries.push(country);
    }
    const y = run.start_date_local.slice(0, 4);
    yearsArr.push(y);
  });
  yearsArr = [...new Set(yearsArr)].sort().reverse();
  provinces = [...new Set(provinces)];
  countries = [...new Set(countries)];
})(activities);
// const totalActivitiesLength = activities.length;

let thisYear = '';
if (yearsArr) {
  [thisYear] = yearsArr;
}

// Page
export default () => {
  const [year, setYear] = useState(thisYear);
  const [runIndex, setRunIndex] = useState(-1);
  const [runs, setActivity] = useState(
    filterAndSortRuns(activities, year, filterYearRuns, sortDateFunc)
  );
  const [title, setTitle] = useState('');
  const [geoData, setGeoData] = useState(geoJsonForRuns(runs));
  // for auto zoom
  const bounds = getBoundsForGeoData(geoData);
  const [intervalId, setIntervalId] = useState();

  const [viewport, setViewport] = useState({
    width: '100%',
    height: 400,
    ...bounds,
  });
  const changeByItem = (item, name, func) => {
    scrollToMap();
    setActivity(filterAndSortRuns(activities, item, func, sortDateFunc));
    setTitle(`${item} ${name} Running Heatmap`);
    setRunIndex(-1);
  };

  const changeYear = (y) => {
    // default year
    setYear(y);
    if (viewport.zoom > 3) {
      setViewport({
        width: '100%',
        height: 400,
        ...bounds,
      });
    }
    changeByItem(y, 'Year', filterYearRuns);
    clearInterval(intervalId);
  };

  const changeCity = (city) => {
    changeByItem(city, 'City', filterCityRuns);
  };

  const changeTitle = (title) => {
    changeByItem(title, 'Title', filterTitleRuns);
  };

  const locateActivity = (run) => {
    setGeoData(geoJsonForRuns([run]));
    setTitle(titleForShow(run));
    clearInterval(intervalId);
    scrollToMap();
  };

  useEffect(() => {
    setViewport({
      width: '100%',
      height: 400,
      ...bounds,
    });
  }, [geoData]);

  useEffect(() => {
    const runsNum = runs.length;
    // maybe change 20 ?
    const sliceNume = runsNum >= 20 ? runsNum / 20 : 1;
    let i = sliceNume;
    const id = setInterval(() => {
      if (i >= runsNum) {
        clearInterval(id);
      }
      const tempRuns = runs.slice(0, i);
      setGeoData(geoJsonForRuns(tempRuns));
      i += sliceNume;
    }, 100);
    setIntervalId(id);
  }, [year]);

  // TODO refactor
  useEffect(() => {
    if (year !== 'Total') {
      return;
    }
    let rectArr = document.querySelectorAll('rect');
    if (rectArr.length !== 0) {
      rectArr = Array.from(rectArr).slice(1);
    }

    rectArr.forEach((rect) => {
      const rectColor = rect.getAttribute('fill');
      // not run has no click event
      if (rectColor !== '#444444') {
        const runDate = rect.innerHTML;
        // ingnore the error
        const [runName] = runDate.match(/\d{4}-\d{1,2}-\d{1,2}/) || [];
        const runLocate = runs
          .filter((r) => r.start_date_local.slice(0, 10) === runName)
          .sort((a, b) => b.distance - a.distance)[0];

        // do not add the event next time
        // maybe a better way?
        if (runLocate) {
          rect.addEventListener(
            'click',
            () => locateActivity(runLocate),
            false
          );
        }
      }
    });
    let polylineArr = document.querySelectorAll('polyline');
    if (polylineArr.length !== 0) {
      polylineArr = Array.from(polylineArr).slice(1);
    }
    // add picked runs svg event
    polylineArr.forEach((polyline) => {
      // not run has no click event
      const runDate = polyline.innerHTML;
      // `${+thisYear + 1}` ==> 2021
      const [runName] = runDate.match(/\d{4}-\d{1,2}-\d{1,2}/) || [
        `${+thisYear + 1}`,
      ];
      const run = runs
        .filter((r) => r.start_date_local.slice(0, 10) === runName)
        .sort((a, b) => b.distance - a.distance)[0];

      // do not add the event next time
      // maybe a better way?
      if (run) {
        polyline.addEventListener('click', () => locateActivity(run), false);
      }
    });
  }, [year]);

  return (
    <Layout>
      <div className="mb5">
        <div className="w-100">
          <h1 className="f1 fw9 i">Running</h1>
        </div>
        {viewport.zoom <= 3 && IS_CHINESE ? (
          <LocationStat
            runs={activities}
            yearsArr={yearsArr}
            countries={countries}
            provinces={provinces}
            runPeriod={runPeriod}
            cities={cities}
            location="location"
            changeYear={changeYear}
            changeCity={changeCity}
            changeTitle={changeTitle}
          />
        ) : (
          <YearsStat
            yearsArr={yearsArr}
            runs={activities}
            year={year}
            onClick={changeYear}
          />
        )}
        <div className="fl w-100 w-70-l">
          <RunMap
            runs={runs}
            year={year}
            title={title}
            viewport={viewport}
            geoData={geoData}
            setViewport={setViewport}
            changeYear={changeYear}
            yearsArr={yearsArr}
            thisYear={thisYear}
            provinces={provinces}
          />
          {year === 'Total' ? (
            <SVGStat />
          ) : (
            <RunTable
              runs={runs}
              year={year}
              locateActivity={locateActivity}
              setActivity={setActivity}
              runIndex={runIndex}
              setRunIndex={setRunIndex}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};