var method = SubscriptionTypes.prototype;

function SubscriptionTypes(id, name) {
    this._id = id;
    this._name = name;
}

method.getid = function() {
	return this._id;
}

method.getName = function() {
    return this._name;
};

module.exports = SubscriptionTypes;