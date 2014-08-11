var Form = exports.Form = function(attributes) {
  var self = this;
  self.errors = {};  

  Object.keys((attributes || {})).forEach(function(key) {
    self[key] = attributes[key];
  });

};

Form.prototype.addError = function(field, description) {
  this.errors[field] = this.errors[field] || [];
  this.errors[field].push(description);
};

Form.prototype.removeError = function(field, description) {
  var arr = this.errors[field] = this.errors[field] || [];
  arr.splice(arr.indexOf(description), 1);
  if (this.errors[field].length === 0) {
    delete this.errors[field];
  }
};

Form.prototype.errorsOn = function(field) {
  return this.errors[field] || [];
};

Form.prototype.hasErrors = function() {
  return Object.keys(this.errors).length > 0;
};

Form.prototype.isValid = function() {
  return !this.hasErrors();
};
