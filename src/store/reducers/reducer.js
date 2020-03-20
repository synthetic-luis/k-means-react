import { combineReducers } from 'redux';
import * as Actions from '../actions/actions';
import * as Constants from '../../constants/index';

// Reducer #1: application state + settings
const initialState = {
    applicationState: 0,
    totalClusters: Constants.Global.INITIAL_TOTAL_CLUSTERS
}

const globalProps = ( state = initialState, action ) => {
    switch (action.type) {
        case Actions.ADVANCE_APPLICATION_STATE:
            return { ...state, applicationState: state.applicationState + 1 };
        default:
            return state;
    }
}

// Reducer #2: chart data
const initialData = {
    datasets: []
}

const chartData = ( state = initialData, action ) => {
    switch (action.type) {
        case Actions.INITIALIZE_CHART_DATA:
            return { ...state, datasets: [ ...action.datasets ] };
        default:
            return state;
    }
}

const kMeansApp = combineReducers({
    globalProps,
    chartData
});

export default kMeansApp;