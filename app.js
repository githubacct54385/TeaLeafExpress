const keyPublishable = process.env.PUBLISHABLE_KEY;
const keySecret = process.env.SECRET_KEY;
const app = require("express")();
const stripe = require("stripe")(keySecret);
var validator = require('express-validator');
var moment = require('moment');
const { check, validationResult } = require('express-validator/check');
app.set("view engine", "pug");
app.use(require("body-parser").urlencoded({extended: false}));
app.use(validator());

// Gathers JSON from thisSub object and creates a Subscription object defined in Subscription.js
var AddSubscriptionToList = function(thisSub, customer) {
  var created = "Subscription Created on: " + 
    moment(new Date(Number(thisSub.created) * 1000)).format('MMMM Do YYYY, h:mm:ss a');
  var currPeriodStart = "Period start on: " + 
    moment(new Date(Number(thisSub.current_period_start) * 1000)).format('MMMM Do YYYY, h:mm:ss a');
  var currPeriodEnd = "Period end on: " + 
    moment(new Date(Number(thisSub.current_period_end) * 1000)).format('MMMM Do YYYY, h:mm:ss a');
  var subName = thisSub.plan.name;
  var frequency = thisSub.plan.interval;
  var amount = thisSub.plan.amount / 100;
  var intervalCharge = "$" + amount + "/" + frequency;
  var email = customer.email;
  var sub_id = thisSub.id;
  var Subscription = require("./Subscription.js");
  var sub1 = new Subscription(sub_id, subName, email, created, currPeriodStart, currPeriodEnd, intervalCharge);
  return sub1;
}

// Gathers the first 100 basicLeaf subscriptions in Stripe
// TODO -- Add Pagination
var GetAllSubscriptionData = function(callback) {
  var activeSubs = [];
  stripe.customers.list({limit: 100}, function(err, customers) {
    for(var i = 0; i < customers.data.length; i++) {
      if(customers.data[i].subscriptions.total_count > 0) {
        for(var j = 0; j < customers.data[i].subscriptions.total_count; j++) {
          var thisSub = customers.data[i].subscriptions.data[j];
          if(thisSub.plan.id != 'basicLeaf') { // If not a basicLeaf sub, ignore
            continue;
          }
          activeSubs.push(AddSubscriptionToList(thisSub, customers.data[i]));
        }
      }
    }
    if(!customers.has_more) {
      callback(activeSubs);
    } else {
      callback(activeSubs);
      // Was going to add pagination below.  Work in progress...


      // need to use Pagination
      //var starting_after = customers.data[customers.data.length - 1].id;
      //stripe.customers.list({limit: 100, starting_after: starting_after}, function(err, moreCustomers) {

      //});
    }
  });
}

// Builds a SubscriptionTypes Object 
var GetSubscriptionTypes = function() {
  var SubscriptionTypes = require("./SubscriptionTypes.js");
  var subTypes = [];
  var subtype1 = new SubscriptionTypes(1, "Basic Leaf");
  var subtype2 = new SubscriptionTypes(2, "Gold Leaf");
  var subtype3 = new SubscriptionTypes(3, "Platinum Leaf");
  subTypes.push(subtype1);
  subTypes.push(subtype2);
  subTypes.push(subtype3);
  return subTypes;
}

app.get("/", (req, res) => {
  // Get the Types of Subscriptions.  Right now, only Basic Leaf exists.
  var subTypes = GetSubscriptionTypes();

  // Get all relevant subscription data and return in activeSubs
  GetAllSubscriptionData(function(activeSubs) {
    // Send subTypes and activeSubs to the index page for display
    res.render("index.pug", {ActiveSubscriptions: activeSubs, SubscriptionTypes: subTypes, keyPublishable});
  });
});

app.post("/DeleteSubscription", (req, res) => {
  var subscriptionId = req["body"]["SubId"];
  // Delete the Subsciption
  stripe.subscriptions.del(subscriptionId, function(err, confirmation) {
    // asynchronously called
    if(err != null) {
      console.log("Subscription Deletion Error: " + err);
    } else {
      console.log("Subsciption with ID: " + subscriptionId + " has been removed ");
    }
    res.render('SubscriptionDeleted', {Error: err});
  })
});

app.post("/valueLeafSubscribe", (req, res) => {
  // Check for a customer with this email
  // TODO -- Add Pagination for lists of customers > 100
  stripe.customers.list(
  { limit: 100, email: req.body.stripeEmail },
  function(err, customers) {
    // asynchronously called
    if(customers["data"].length > 0) {
      // at least one customer exists with this email
      console.log("Customer match found for: " + req.body.stripeEmail);
      var customerId = customers["data"][0]["id"];
      stripe.subscriptions.create({
        customer: customerId,
        items: [
        {
          plan: "basicLeaf",
        },
        ]
        });
      console.log("Subscription Created!");
      res.render("SubscriptionCreated.pug", {SubName: "ValueLeaf", Cost: 1000/100});
    } else {
      // no customer with this email exists in Stripe DB
      console.log("No customer exists for " + req.body.stripeEmail);
      console.log("Creating a customer now...");
      var customerDesc = 'Customer for ' + req.body.stripeEmail;
      stripe.customers.create({
        description: customerDesc,
          source: req.body.stripeToken,
          email: req.body.stripeEmail // obtained with Stripe.js
      }).then(customer => 
        stripe.subscriptions.create({
        customer: customer.id,
        items: [
        {
          plan: "basicLeaf",
        },
        ]
        }))
        console.log("SubscriptionCreated");
        res.render("SubscriptionCreated.pug", {SubName: "ValueLeaf", Cost: 1000/100});
    }
    })
  });

app.listen(4567);