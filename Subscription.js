var method = Subscription.prototype;

function Subscription(id, name, email, created, periodStart, periodEnd, intervalCharge) {
    this._id = id;
    this._name = name;
    this._email = email;
    this._created = created;
    this._periodStart = periodStart;
    this._periodEnd = periodEnd;
    this._intervalCharge = intervalCharge;
}

module.exports = Subscription;