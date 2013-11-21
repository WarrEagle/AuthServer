var MongoClient = require('mongodb').MongoClient, async = require('async'), collections = ['purchases', 'checkouts', 'users'];
MongoClient.connect("mongodb://localhost/kickassdev", function(err, db) {
	if (err) {
		return process.exit(1);
	}
	async.map(collections, function(collection, cb) {
		console.log('Coll: %s', collection);
		db.collection(collection).drop(cb);
	}, function(err) {
		if (err) {
			return process.exit(1);
		}
		console.log('%s are dropped.', collections.toString());
		process.exit(0);
	});
});

