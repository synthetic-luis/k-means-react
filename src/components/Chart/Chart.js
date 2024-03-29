import React, {Component} from 'react';
//import {Scatter} from 'react-chartjs-2';
import Chart from 'chart.js';
import * as Constants from '../../constants/index';
import Button from '../UI/Button/Button';
import { Motion, spring } from 'react-motion';
import { connect } from 'react-redux';
import * as actions from '../../store/actions/actions';
import settingsLogo from '../../resources/images/settings-icon.png';
// import settingsIcon from '../resources/images/settings-icon.png';
/*
import { BasicLottieComponent } from '../Lottie/LottieControl';
import { Lottie } from '@crello/react-lottie';
*/

class MyChart extends Component {
    chartRef = React.createRef();
    myChart;
  
    constructor(props) {
        super(props);
        Chart.defaults.global.defaultFontFamily = Constants.Global.FONT;
        Chart.defaults.global.legend.labels.usePointStyle = true;
    }

    componentDidMount() {
        const myChartRef = this.chartRef.current.getContext("2d");

        this.myChart = new Chart(myChartRef, {
            type: "scatter",
            datasets: [],
            options: {
                events: [ 'click' ],
                tooltips: { 
                    enabled: true,
                    mode: 'point'
                 },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        fontColor: '#333'
                    }
                },                
                /*
                scales: {
                    xAxes: [{
                        ticks: {
                            max: Constants.ChartProps.AXIS_MAX - 10,
                            min: Constants.ChartProps.AXIS_MIN,
                            stepSize: Constants.ChartProps.AXIS_STEP
                        }
                    }
    
                    ],
                    yAxes: [{
                        ticks: {
                            max: Constants.ChartProps.AXIS_MAX,
                            min: Constants.ChartProps.AXIS_MIN,
                            stepSize: Constants.ChartProps.AXIS_STEP
                        }
                    }]
                },
                */
                
                animation: {
                    duration: Constants.ChartProps.ANIMATION_DURATION,
                    easing: Constants.ChartProps.ANIMATION_TYPE
                }
            }
        });
      }

    // Initializes (or shuffles) the data in the cart
    initializeData = () => {
        const datasets = [ ...this.props.datasets ];

        // We start off by generating the points for the chart for the unassigned category
        const points = this.generateRandomPoints(Constants.Global.NUM_OF_DATA_POINTS);

        // Then, we check whether we are initializing data or shuffling existing data
        if ( datasets.length === 0 ) {
            // We are initializing data. For each cluster we have, we:
            // 1) Push a dataset for the points associated with the cluster
            // 2) Push a dataset for the cluster itself, setting a random position for it
            for ( let i=0; i<this.props.numOfClusters; i++ ) {
                // 1) We get the corresponding group dataset and initialize the data as an empty array
                const groupDataset = { ...Constants.Styles.Group[ i ] };
                groupDataset.data = [];
    
                // 2) And then the corresponding centroid dataset
                const centroidDataset = { ...Constants.Styles.Centroid[ i ]  };
    
                // We give the centroid a starting position based on an existing points
                // TODO: maybe have this so that they're always different for each point
                centroidDataset.data = [ points[ Math.floor( Math.random() * ( points.length - 1 ) ) ] ];
    
                // Finally, we push both the group and centroid datasets
                datasets.push( groupDataset, centroidDataset );
            }
    
            // Finally, we push push an unassigned dataset which will contain all the points initially
            const unassignedDataset = { ...Constants.Styles.Unassigned[0] };
            unassignedDataset.data = points;
            datasets.push( unassignedDataset );
        } else {
            // We are shuffling existing data instead, so we update the datasets accordingly:
            // First, for each centroid, we get a new random point
            // (centroids are always at uneven positions, so we start a 1 and advance by 2)
            for ( let j=1; j<datasets.length; j=j+2 )  {
                datasets[j].data = [ points[ Math.floor( Math.random() * ( points.length - 1 ) ) ] ];
            }

            // Finally, we get new unassigned points
            // (the unassigned set is the last dataset, so it's at position [ num clusters * 2 ])
            let unassignedDataset = datasets[ this.props.numOfClusters * 2 ];
            unassignedDataset.data = points;
        }

        // We store this data with the reducer
        this.props.onUpdateChartData( datasets );
    }

    // Performs a step of the algorithm
    performStep = () => {
        if (this.props.datasets.length === 0) {
            alert('There\'s no data to work with!');

            return;
        }

        let datasets = [ ...this.props.datasets ];

        // We perform a step of the k-means algorithm, which involves two things:
        // 1) Assign each point to its closest centroid
        // 2) Re-position the centroids according to the average position of all its corresponding points

        // We start with 1) by calculating the distance of each point to all centroids
        // to assign the point to its closest centroid
        let points = [];
        let pointsAreAssigned = datasets[0].data.length !== 0;

        // We first check if this is the first assignment
        if ( !pointsAreAssigned ) {
            // If so, we'll get all points from the unassigned dataset
            points = [ ...datasets[ this.props.numOfClusters * 2 ].data ];

            // We clear the unassigned points, as they are in the process of being assigned
            datasets[ this.props.numOfClusters * 2 ].data = [];
        } else {
            // Otherwise, it's not the first assignment, so we get points by pushing the data from each group
            // into the points array
            for ( let j=0; j<datasets.length-1; j=j+2 ) {
                points.push( [ ...datasets[ j ].data ] );
            }
        }

        // In any case, we get all the points with their corresponding centroid assignments
        // and store them in the appropriate group. Also, we reposition the centroids
        let orderedPoints = this.assignPointsToCentroids( points, pointsAreAssigned );
              
        // Then, we assign the ordered points to the correct groups
        for ( let i=0; i<orderedPoints.length; i++ ) {
            datasets[ i * 2 ].data = orderedPoints[ i ];
        }

        // We update the state and animate the chart with no animation to prevent points from shifting places
        this.props.onUpdateChartData( datasets );
        this.updateChart( 0 );

        // Then, we use a neat little trick using setTimeout to animate the centroids (as opposed to NOT animating points),
        // so that the algorithm can be fully appreciated by the user!
        setTimeout(() => {
            let doneClustering = true;

            // Then, we update the centroids' data and update the chart once again
            for ( let i=0; i<orderedPoints.length; i++ ) {
                let currentCentroidPos = datasets[ ( i * 2 ) + 1 ].data;

                // First, we calculate the new position of the centroid
                let newCentroidPos = [ this.getAveragePositionOfPoints( orderedPoints[ i ] ) ];

                // Then, we check whether the centroid stays in the same position
                if ( !this.pointsAreEqual( currentCentroidPos[ 0 ], newCentroidPos[ 0 ] ) ) {
                    // If not, we are not done clustering
                    doneClustering = false;
                }

                // Finally, we move the centroid to the new position
                datasets[ ( i * 2 ) + 1 ].data = newCentroidPos;
            }

            // If we are done clustering, we go to the final step
            if ( doneClustering ) {
                this.props.onAdvanceState();
                return;
            }

            this.props.onUpdateChartData( datasets );
            this.updateChart( );

            // Finally, we also increase the algorithm steps
            // We do so with a timer so that the increase goes in sync with the chart motion
            setTimeout(() => {
                this.props.onIncrementAlgorithmSteps();
            }, Constants.Global.AUTOMATIC_STEPS_INTERVAL / 2)
        }, 0);
    }

    // Determines if 2 points are equal
    pointsAreEqual = ( point1, point2 ) => {
        return point1.x === point2.x && point1.y === point2.y;  
    };
    

    // Traverses through a list of points, assigning points to the group of the centroid to which
    // they are closest to, returning the points in the form of an array
    assignPointsToCentroids = ( points, pointsAssignedAlready ) => {
        let datasets = this.props.datasets;
        let assignedPoints = []; // each element will contain points that correspond to the (n*2 + 1) centroid (if unassigned)
        
        // If there's no data, we return
        if ( datasets.length === 0) {
            alert('We have no data to work with!');
            return [];
        }

        let centroidPoints = [];
        let counter = 0; // counter for assigned points (since the for loop uses centroid indexes)

        // We first get all centroid positions
        for ( let i=1; i<datasets.length; i=i+2 )  {
            centroidPoints.push( datasets[ i ].data[ 0 ] );

            // If points are unassigned, we also use this loop to initialize the return array,
            // creating an empty array at each index
            if (!pointsAssignedAlready) {
                assignedPoints[ counter ] = []; 
                counter++;
            }
        }

        // If points are unassigned, they'll all be elements of an array, so we proceed to assign distances
        if ( !pointsAssignedAlready ) {
            // Then, for each point, we find its distance to all existing centroids
            points.forEach( point => {
                // We calculate the distance to each centroid for this point
                let centroidDistances = centroidPoints.map(( cPoint ) => {
                    return this.getDistanceBetweenPoints( point, cPoint );
                });

                // We find the index of the closest centroid by using the index of the minimum distance
                let closestCentroidIndex = centroidDistances.indexOf(Math.min( ...centroidDistances ))

                // Finally, we place the point in the correct array element (corresponding to a centroid)
                assignedPoints[ closestCentroidIndex ].push( point );
            });

            return assignedPoints;
        } else {
            // Otherwise, the points came assigned already. To maintain a smooth chart, we will 
            // need to push/remove elements dynamically from different arrays if they changed groups

            // For each array level...
            for ( let i=0; i<points.length; i++ ) {
                let pointsArr = points[ i ];

                // Then, for each array with points corresponding to the (n*2)th level, we start from the back
                // of the array to be able to splice
                for ( let k=pointsArr.length-1; k>=0; k-- ) {
                    const point = pointsArr[ k ];

                    // For each point, we calculate the distances to all centroids and return those distances in an array
                    let centroidDistances = centroidPoints.map(( cPoint ) => {
                        return this.getDistanceBetweenPoints( point, cPoint );
                    });

                    // Get the index of the closest centroid
                    let closestCentroidIndex = centroidDistances.indexOf(Math.min( ...centroidDistances ) );
                    
                    // If the outer loop's counter value is different than the closest centroid index, the point needs to be moved to a different array level
                    if ( i !== closestCentroidIndex ) {
                        // We splice the point off of the current points array level and push it into the correct array level
                        points[ closestCentroidIndex ].push( pointsArr.splice( k, 1 )[ 0 ] );
                    }
                }
            }

            return [ ...points ];
        }
    }

    // Returns the Cartesian, 2D distance between 2 points
    getDistanceBetweenPoints = (pointA, pointB) => {
        return Math.sqrt( Math.pow( ( pointB.x - pointA.x ), 2 ) + Math.pow( ( pointB.y - pointA.y ), 2 ) );
    }
    
    generateRandomPoints = ( num ) => {
        let points = [];

        if ( this.props.pointsDistribution === "linear" ) {
            // We generate points in an orderly (somewhat linear) fashion (we allow x and y coordinates to be up to z points away in the positive direction for both)
            // logic here: https://stackoverflow.com/questions/4959975/generate-random-number-between-two-numbers-in-javascript (i + 5 - i + 1) = (5+1) = (6)
            for ( let i=0; i<num; i++ ) {
                points.push({ x: parseFloat( Math.abs( Math.random() * Constants.Global.LINEAR_DATA_X_MULTIPLIER + i ).toFixed( 2 ) ), y: parseFloat(Math.abs( Math.random() * Constants.Global.LINEAR_DATA_Y_MULTIPLIER + i ).toFixed( 2 ) ) });
            }
        } else {
            // We generate points randomly
            for ( let i=0; i<num; i++ ) {
                points.push({ x: parseFloat( Math.abs( Math.random() ).toFixed( 2 ) * Constants.Global.SCATTERED_DATA_X_MULTIPLIER ), y: parseFloat(Math.abs( Math.random() ).toFixed( 2 ) ) * Constants.Global.SCATTERED_DATA_Y_MULTIPLIER });
            }
        }

        return points;
    }

    // Updates the chart based on the given datasets
    updateChart = ( duration = Constants.Global.ANIMATION_DURATION ) => {
        this.myChart.data.datasets = this.props.datasets;
        this.myChart.update( duration );
    }

    // Continues each step until clustering is finished
    performAutomatically = () => {
        // We mark that we are going automatic
        this.props.onSetAutomatic( true );

        // We perform a step immediately
        this.performStep();

        // Then, we set up an interval that performs steps every certain time
        let stepInterval = window.setInterval(() => {

            // If there are no more steps, we stop the interval
            if ( this.props.applicationState === Constants.ApplicationStates.FINISHED ) {
                clearInterval(stepInterval);

                return;
            }

            this.performStep();
        }, Constants.Global.AUTOMATIC_STEPS_INTERVAL);
    }


    // This returns the average position of all points in a cluster
    getAveragePositionOfPoints = ( points ) => {
        if (points.length === 0) {
            return { x: 0, y: 0 };
        }

        // TODO: account for length 0 and 1
        // We traverse each point, keeping track of the sums of the X and Y coordinates
        let xSum = 0;
        let ySum = 0;

        points.forEach(point => {
            xSum += point.x;
            ySum += point.y;
        });

        // Then, we return a point that contains the average of all points in the team
        return { x: ( xSum / points.length ).toFixed( 2 ), y: ( ySum / points.length ).toFixed( 2 ) };
    }

    // Resets the chart data and puts the app in the "Randomize" application state
    reset = () => {
        this.props.onUpdateChartData( [] );
        this.props.onResetApplicationState();
    }

    showSettings = () => {
        this.props.onUpdateShowSettingsModal( !this.props.showSettingsModal );
    }

    showSummary = () => {
        this.props.onUpdateShowSummaryModal( !this.props.showSummaryModal );
    }

    showExplainer = () => {
        this.props.onUpdateShowExplainerModal( !this.props.showExplainerModal );
    }

    render() {
        let btn1Props = {};
        let btn2Props = {};
        let button1Classes = Constants.Global.BUTTON_LEFT_CLASSES;
        let button2Classes = Constants.Global.BUTTON_RIGHT_CLASSES;
        let btnStyle = { opacity: 0 };
        let btnDefaultStyle = { opacity: spring(1)};
        let isDisabled = false;

        // console.log(this.props.datasets);

        // Creates properties for buttons depending on the application state we're in
        switch( this.props.applicationState ) {
            case Constants.ApplicationStates.BEGIN:
                btn1Props = {
                    title: "How It Works",
                    classes: button1Classes,
                    clickFn: this.showExplainer
                }

                btn2Props = {
                    title: "Get started",
                    classes: button2Classes,
                    clickFn: this.props.onAdvanceState
                }

                break;

            case Constants.ApplicationStates.RANDOMIZE:
                btn1Props = {
                    title: ( this.props.datasets.length === 0 ) ? "Shuffle Data" : "Shuffle Again",
                    classes: button1Classes,
                    clickFn: this.initializeData
                }

                btn2Props = {
                    title: "Continue",
                    classes: button2Classes,
                    clickFn: this.props.onAdvanceState
                }

                if ( this.props.shouldPerformStep ) {
                    // We perform a step for the user and then disable this value
                    this.initializeData();
                    this.props.onSetShouldPerformStep( false );
                }

                // If we have no unassigned points yet, we disable the continue button
                let unassignedDatasetIndex = this.props.numOfClusters * 2;

                if (this.props.datasets.length === 0 || 
                    this.props.datasets[ unassignedDatasetIndex ] === undefined ||
                    this.props.datasets[ unassignedDatasetIndex ].data.length === 0) {
                    isDisabled = true;
                }
                
                this.updateChart(  );
                break;

            case Constants.ApplicationStates.STEPS:
                btn1Props = {
                    title: "Manual Step",
                    classes: button1Classes,
                    clickFn: this.performStep
                }

                btn2Props = {
                    title: "All Steps",
                    classes: button2Classes,
                    clickFn: this.performAutomatically
                }

                break;

            case Constants.ApplicationStates.FINISHED:
                btn1Props = {
                    title: "Summary",
                    classes: button1Classes,
                    clickFn: this.showSummary
                }

                btn2Props = {
                    title: "Reset",
                    classes: "Button Button3",
                    clickFn: this.reset
                }

                // If the reset button is not showing, we create a timeout to show it after
                // the chart has finished its last animation
                if ( !this.props.showResetButton ) {
                    setTimeout(() => {
                        this.props.onUpdateShowResetButton( true );
                    }, Constants.Global.AUTOMATIC_STEPS_INTERVAL * 1.5 );
                }

                break;

            default:
                btn1Props = {
                    title: "",
                    classes: "hide",
                    clickFn: (() => {})
                }

                btn2Props = {
                    title: "",
                    classes: "hide",
                    clickFn: (() => {})
                }
            }

            // Then, we set the content of the left-hand side column based on whether the algorithm is finished
            let leftColumnContent;
            if ( this.props.applicationState === Constants.ApplicationStates.FINISHED )  {
                leftColumnContent =
                <Motion  key={ this.props.applicationState }  defaultStyle={{ x: -300, opacity: 0 }  } style={ { x: spring(0, { stiffness: 120, damping: 11 } ), opacity: 1 } }>
                { style => (
                    <div style={{ 
                                transform: `translateX(${style.x}px)`,
                                opacity: style.opacity
                            }}>
                        <span>Nice job! Try again?</span>
                    </div>
                )}
                </Motion>
            } else {
                leftColumnContent =
                <Motion defaultStyle={ btnStyle } style={ btnDefaultStyle }>
                { style => (
                    <span style={{ opacity: style.opacity }} id="Steps-Container">
                        <span id="Steps-Label">Total Steps:</span> 
                        <span id="Steps">{ this.props.currentAlgorithmSteps }</span>
                    </span>
                )}   
                </Motion>
            }

            let button1 = <Motion key={ this.props.applicationState + '_1' } defaultStyle={ btnStyle } style={ btnDefaultStyle }>
            { style => (
                <Button 
                    style={{ opacity: style.opacity }}
                    title={ btn1Props.title }
                    className={ btn1Props.classes }
                    clicked={ btn1Props.clickFn }
                    disabled = { this.props.isAutomatic && this.props.applicationState === Constants.ApplicationStates.STEPS }
                />
            )}
            </Motion>

            let button2 = <Motion key={ this.props.applicationState + '_2' } defaultStyle={ btnStyle } style={ btnDefaultStyle }>
            { style => (
                <Button 
                    style={{ opacity: style.opacity }}
                    title={ btn2Props.title }
                    className={ btn2Props.classes }
                    clicked={ btn2Props.clickFn }
                    disabled = { isDisabled || ( this.props.isAutomatic && this.props.applicationState === Constants.ApplicationStates.STEPS ) }
                />
            )}
            </Motion>

            // Finally, if we are in the finished stage but we are not showing the reset button yet, we don't show any buttons
            if ( this.props.applicationState === Constants.ApplicationStates.FINISHED && !this.props.showResetButton ) {
                button1 = null;
                button2 = null;
            }

        return (
            <div>
                <canvas id="myChart" ref={this.chartRef} />
                <div className="Controls">
                    <span className="Column Left-Column">
                        { leftColumnContent }
                    </span>
                    <span className="Column Middle-Column">

                    { button1 }
                    { button2 }
                    </span>

                    <span className="Column Right-Column">
                        <Button
                            className="Button SettingsButton"
                            title="Settings"
                            clicked={ this.showSettings }
                            iconURL={ settingsLogo }
                            disabled={ this.props.isAutomatic && this.props.applicationState === Constants.ApplicationStates.STEPS }
                        />
                    </span>
                </div>
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        applicationState: state.globalProps.applicationState,
        numOfClusters: state.globalProps.numOfClusters,
        isAutomatic: state.globalProps.isAutomatic,
        datasets: state.data.datasets,
        showSettingsModal: state.globalProps.showSettingsModal,
        shouldPerformStep: state.globalProps.shouldPerformStep,
        pointsDistribution: state.globalProps.pointsDistribution,
        currentAlgorithmSteps: state.globalProps.currentAlgorithmSteps,
        showResetButton: state.globalProps.showResetButton,
        showSummaryModal: state.globalProps.showSummaryModal,
        showExplainerModal: state.globalProps.showExplainerModal
    }
}

const mapDispatchToProps = dispatch => {
    return {
        onAdvanceState: () => dispatch(actions.advanceState()),
        onUpdateChartData: ( datasets ) => dispatch(actions.updateChartData( datasets )),
        onSetAutomatic: ( isAutomatic ) => dispatch( actions.setAutomatic( isAutomatic ) ),
        onResetApplicationState: () => dispatch( actions.resetApplicationState() ),
        onUpdateShowSettingsModal: ( show ) => dispatch( actions.updateShowSettingsModal( show ) ),
        onSetShouldPerformStep: ( performStep ) => dispatch( actions.setShouldPerformStep( performStep ) ),
        onIncrementAlgorithmSteps: () => dispatch( actions.incrementAlgorithmSteps() ),
        onUpdateShowResetButton: ( show ) => dispatch( actions.updateShowResetButton( show ) ),
        onUpdateShowSummaryModal: ( show ) => dispatch( actions.updateShowSummaryModal( show ) ),
        onUpdateShowExplainerModal: ( show ) => dispatch( actions.updateShowExplainerModal( show ) )
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(MyChart);
