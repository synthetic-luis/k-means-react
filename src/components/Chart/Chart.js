import React, {Component} from 'react';
//import {Scatter} from 'react-chartjs-2';
import Chart from 'chart.js';
import * as Constants from '../../constants/index';
import Button from '../UI/Button/Button';
import { Motion, spring } from 'react-motion';
import { connect } from 'react-redux';
import * as actions from '../../store/actions/actions';


class MyChart extends Component {
    chartRef = React.createRef();
    myChart;
  
    constructor(props) {
        super(props);

        Chart.defaults.global.defaultFontFamily = Constants.Global.FONT;
    }

    componentDidMount() {
        const myChartRef = this.chartRef.current.getContext("2d");

        this.myChart = new Chart(myChartRef, {
            type: "scatter",
            //data: {
            datasets: [],
            options: {
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
            //} 
        });
      }

    // Initializes (or shuffles) the data in the cart
    initializeData = () => {
        const datasets = [ ...this.props.datasets ];

        // We start off by generating the points for the chart for the unassigned category
        const points = this.generateRandomPoints(Constants.Global.NUM_OF_DATA_POINTS, true);

        // Then, we check whether we are initializing data or shuffling existing data
        if ( datasets.length === 0 ) {
            // We are initializing data. For each cluster we have, we:
            // 1) Push a dataset for the points associated with the cluster
            // 2) Push a dataset for the cluster itself, setting a random position for it
            for ( let i=0; i<this.props.totalClusters; i++ ) {
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
            let unassignedDataset = datasets[ Constants.Global.INITIAL_TOTAL_CLUSTERS * 2 ];
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
            points = [ ...datasets[ Constants.Global.INITIAL_TOTAL_CLUSTERS * 2 ].data ];

            // We clear the unassigned points, as they are in the process of being assigned
            datasets[ Constants.Global.INITIAL_TOTAL_CLUSTERS * 2 ].data = [];
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
    
    generateRandomPoints = (num, ordered) => {
        let points = [];

        if (ordered) {
            // We generate points in an orderly (somewhat linear) fashion (we allow x and y coordinates to be up to z points away in the positive direction for both)
            // logic here: https://stackoverflow.com/questions/4959975/generate-random-number-between-two-numbers-in-javascript (i + 5 - i + 1) = (5+1) = (6)
            for ( let i=0; i<num; i++ ) {
                points.push({ x: parseFloat( Math.abs( Math.random() * Constants.Global.LINEAR_DATA_X_MULTIPLIER + i ).toFixed( 2 ) ), y: parseFloat(Math.abs( Math.random() * Constants.Global.LINEAR_DATA_Y_MULTIPLIER + i ).toFixed( 2 ) ) });
            }
        } else {
            // We generate points randomly
            for ( let i=0; i<num; i++ ) {
                points.push({ x: parseFloat( Math.abs( Math.random() ).toFixed( 2 ) * 100 ), y: parseFloat(Math.abs( Math.random() ).toFixed( 2 ) ) * 100 });
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
        this.props.onSetAutomatic( false ); // we do this in case the user previously had used automatic
        this.props.onUpdateChartData( [] );
        this.props.onResetApplicationState();
    }

    render() {
        let btn1Props = {};
        let btn2Props = {};
        let button1Classes = "Button Button1";
        let button2Classes = "Button Button2";
        let btnStyle = { opacity: 0 };
        let btnDefaultStyle = { opacity: spring(1 , { stiffness: Constants.ReactMotion.BTN_STIFFNESS, damping: Constants.ReactMotion.BTN_DAMPING })};
        let isDisabled = false;

        // Creates properties for buttons depending on the application state we're in
        switch( this.props.applicationState ) {
            case Constants.ApplicationStates.BEGIN:
                btn1Props = {
                    title: "Begin",
                    classes: button1Classes,
                    clickFn: this.props.onAdvanceState
                }

                btn2Props = {
                    title: "",
                    classes: "hide",
                    clickFn: (() =>{})
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

                // If we have no unassigned points yet, we disable the continue button
                let unassignedDatasetIndex = Constants.Global.INITIAL_TOTAL_CLUSTERS * 2;

                if (this.props.datasets.length === 0 || 
                    this.props.datasets[ unassignedDatasetIndex ] === undefined ||
                    this.props.datasets[ unassignedDatasetIndex ].data.length === 0) {
                    isDisabled = true;
                }
                
                this.updateChart( );
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
                    title: "Reset",
                    classes: "Button Button3",
                    clickFn: this.reset
                }

                btn2Props = {
                    title: "",
                    classes: "hide",
                    clickFn: (() =>{})
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

        return (
            <div>                
                <div className="Chart">
                 <canvas 
                    id="myChart"
                    ref={this.chartRef}
                    />
                </div> 

                <Motion key={ this.props.applicationState + '_1' } defaultStyle={ btnStyle } style={ btnDefaultStyle }>
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

                <Motion key={ this.props.applicationState + '_2' } defaultStyle={ btnStyle } style={ btnDefaultStyle }>
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
            </div>
        );
    }
}

const mapStateToProps = state => {
    return {
        applicationState: state.globalProps.applicationState,
        totalClusters: state.globalProps.totalClusters,
        isAutomatic: state.globalProps.isAutomatic,
        datasets: state.data.datasets
    }
}

const mapDispatchToProps = dispatch => {
    return {
        onAdvanceState: () => dispatch(actions.advanceState()),
        onUpdateChartData: ( datasets ) => dispatch(actions.updateChartData( datasets )),
        onSetAutomatic: ( isAutomatic ) => dispatch( actions.setAutomatic( isAutomatic ) ),
        onResetApplicationState: () => dispatch( actions.resetApplicationState() )
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(MyChart);

/*
<Scatter ref={ref => this.chartReference = ref} data={this.state} options={options} />
https://www.youtube.com/watch?v=_aWzGGNrcic

K-means clustering 

Input: K (a set of points x1 ... xn)

Steps:
1) Place centroids c1...ck at random locations

Repeat until convergence:
    for each point xi:
    a) find nearest centroid cj
    b) assign the point xi to cluster j

    for each cluster j = 1...K
    c) new centroid cj = mean of all points xi assigned to cluster j in previous step




*/