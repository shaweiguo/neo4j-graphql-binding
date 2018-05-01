"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getOperationTypes = exports.buildTypeDefs = undefined;

var _graphql = require("graphql");

var buildTypeDefs = exports.buildTypeDefs = function buildTypeDefs(_ref) {
  var typeDefs = _ref.typeDefs,
      query = _ref.query,
      mutation = _ref.mutation;

  var parsed = (0, _graphql.parse)(typeDefs);
  var buildQueries = typeof query === "boolean" ? query : true;
  var buildMutations = typeof mutation === "boolean" ? mutation : true;
  var typeMaps = buildTypeMaps(parsed);
  parsed = possiblyBuildSchemaDefinition(parsed, typeMaps, buildQueries, buildMutations);
  parsed = possiblyBuildOperationTypes(parsed, typeMaps, buildQueries, buildMutations);
  var operationMaps = buildOperationMap(parsed);
  var types = typeMaps.types;
  var models = typeMaps.models;
  var queries = operationMaps.queries;
  var mutations = operationMaps.mutations;
  var arr = Object.keys(models);
  var i = 0;
  var obj = {};
  var key = "";
  var len = arr.length;
  var orderingType = {};
  var modelType = {};
  var queryType = {};
  var mutationType = {};
  for (; i < len; ++i) {
    key = arr[i];
    obj = models[key];
    if (queries && queries.fieldMap && !queries.fieldMap[key]) {

      modelType = buildModelType(key, obj.def, models);
      parsed.definitions[obj.index] = modelType;

      orderingType = buildOrderingType(key, obj.def);
      parsed.definitions.push(orderingType);

      queryType = buildQueryType(key, obj.def);
      parsed.definitions[queries.index].fields.push(queryType);
    }
    if (mutations && mutations.fieldMap && !mutations.fieldMap["create" + key]) {
      mutationType = buildMutationType(key, obj.def);
      parsed.definitions[mutations.index].fields.push(mutationType);
    }
  }
  parsed = possiblyBuildLongScalar(parsed);
  return (0, _graphql.print)(parsed);
};
var getOperationTypes = exports.getOperationTypes = function getOperationTypes(parsed) {
  var arr = parsed ? parsed.definitions : [];
  var len = arr.length;
  var i = 0;
  var obj = {};
  var query = false;
  var mutation = false;
  for (; i < len; ++i) {
    obj = arr[i];
    if (isObjectType(obj)) {
      if (obj.name.value === "Query") {
        query = obj;
      } else if (obj.name.value === "Mutation") {
        mutation = obj;
      }
    }
  }
  return {
    query: query,
    mutation: mutation
  };
};

var buildTypeMaps = function buildTypeMaps(parsed) {
  var arr = parsed ? parsed.definitions : [];
  var len = arr.length;
  var i = 0;
  var obj = {};
  var name = "";
  var models = {};
  var types = {};
  for (; i < len; ++i) {
    obj = arr[i];
    if (isObjectType(obj)) {
      if (isModel(obj)) {
        models[obj.name.value] = {
          index: i,
          def: obj
        };
      } else if (obj.name.value !== "Query" && obj.name.value !== "Mutation") {
        types[obj.name.value] = {
          index: i,
          def: obj
        };
      }
    }
  }
  return {
    models: models,
    types: types
  };
};
var isObjectType = function isObjectType(def) {
  return def && def.kind === "ObjectTypeDefinition";
};
var isModel = function isModel(def) {
  var directives = def.directives ? def.directives : [];
  var len = directives.length;
  var d = 0;
  var directive = {};
  var name = "";
  var isModel = false;
  for (; d < len; ++d) {
    directive = directives[d];
    name = directive.name.value;
    if (name === "model") {
      isModel = true;
    }
  }
  return isModel;
};
var possiblyBuildSchemaDefinition = function possiblyBuildSchemaDefinition(parsed, typeMaps, queries, mutations) {
  if (Object.keys(typeMaps.models).length > 0) {
    var schemaDefinition = getSchemaDefinition(parsed);
    if (schemaDefinition && schemaDefinition.def && schemaDefinition.index >= 0) {
      var schemaDefOperationIndex = schemaDefinition.index;
      var _operationTypes = schemaDefinition.def.operationTypes;
      var query = false;
      var mutation = false;
      _operationTypes.forEach(function (operation) {
        if (operation.operation === "query" && operation.type.name.value === "Query") {
          query = true;
        } else if (operation.operation === "mutation" && operation.type.name.value === "Mutation") {
          mutation = true;
        }
      });
      if (!query && queries) {
        parsed.definitions[schemaDefOperationIndex].operationTypes.push(buildOperationTypeDefinition({
          operation: "query",
          name: "Query"
        }));
      }
      if (!mutation && mutations) {
        parsed.definitions[schemaDefOperationIndex].operationTypes.push(buildOperationTypeDefinition({
          operation: "mutation",
          name: "Mutation"
        }));
      }
    } else if (schemaDefinition === null) {
      parsed.definitions.push(buildSchemaDefinition({
        query: queries,
        mutation: mutations
      }));
    }
  }
  return parsed;
};
var possiblyBuildLongScalar = function possiblyBuildLongScalar(parsed) {
  if (!longScalarTypeExists(parsed)) {
    parsed.definitions.push({
      "kind": "ScalarTypeDefinition",
      "name": {
        "kind": "Name",
        "value": "Long"
      },
      "directives": []
    });
  }
  return parsed;
};
var possiblyBuildOperationTypes = function possiblyBuildOperationTypes(parsed, typeMaps, queries, mutations) {
  if (Object.keys(typeMaps.models).length > 0) {
    var _operationTypes2 = getOperationTypes(parsed);
    if (!_operationTypes2.query && queries) {
      parsed.definitions.push(buildObjectTypeDefinition({
        name: "Query"
      }));
    }
    if (!_operationTypes2.mutation && mutations) {
      parsed.definitions.push(buildObjectTypeDefinition({
        name: "Mutation"
      }));
    }
  }
  return parsed;
};
var longScalarTypeExists = function longScalarTypeExists(parsed) {
  var arr = parsed ? parsed.definitions : [];
  var len = arr.length;
  var i = 0;
  var obj = {};
  var longScalarExists = false;
  for (; i < len; ++i) {
    obj = arr[i];
    if (obj.kind === "ScalarTypeDefinition" && obj.name.value === "Long") {
      longScalarExists = true;
    }
  }
  return longScalarExists;
};
var buildOperationMap = function buildOperationMap(parsed) {
  var arr = parsed ? parsed.definitions : [];
  var len = arr.length;
  var i = 0;
  var obj = {};
  var name = "";
  var queries = {};
  var mutations = {};
  for (; i < len; ++i) {
    obj = arr[i];
    if (isObjectType(obj)) {
      if (obj.name.value === "Query") {
        queries = {
          index: i,
          fieldMap: buildFieldMap(obj.fields)
        };
      } else if (obj.name.value === "Mutation") {
        mutations = {
          index: i,
          fieldMap: buildFieldMap(obj.fields)
        };
      }
    }
  }
  return {
    queries: queries,
    mutations: mutations
  };
};
var getSchemaDefinition = function getSchemaDefinition(parsed) {
  var defs = parsed ? parsed.definitions : [];
  var len = defs.length;
  var i = 0;
  for (; i < len; ++i) {
    if (isSchemaDefinition(defs[i])) {
      return {
        def: defs[i],
        index: i
      };
    }
  }
  return null;
};
var buildSchemaDefinition = function buildSchemaDefinition(_ref2) {
  var query = _ref2.query,
      mutation = _ref2.mutation;

  if (!query && !mutation) return null;
  return {
    "kind": "SchemaDefinition",
    "directives": [],
    "operationTypes": operationTypes({
      query: query,
      mutation: mutation
    })
  };
};
var operationTypes = function operationTypes(_ref3) {
  var query = _ref3.query,
      mutation = _ref3.mutation;

  var operationTypes = [];
  if (query) {
    operationTypes.push(buildOperationTypeDefinition({
      operation: "query",
      name: "Query"
    }));
  }
  if (mutation) {
    operationTypes.push(buildOperationTypeDefinition({
      operation: "mutation",
      name: "Mutation"
    }));
  }
  return operationTypes;
};
var buildModelFields = function buildModelFields(modelName, definition, models) {
  var fields = [{
    "kind": "FieldDefinition",
    "name": {
      "kind": "Name",
      "value": "_id"
    },
    "arguments": [],
    "type": {
      "kind": "NamedType",
      "name": {
        "kind": "Name",
        "value": "Long"
      }
    },
    "directives": []
  }];
  var arr = definition.fields;
  var len = arr.length;
  var i = 0;
  var obj = {};
  var name = {};
  var type = {};
  for (; i < len; ++i) {
    obj = arr[i];
    name = obj.name;
    type = obj.type;
    fields.push({
      "kind": "FieldDefinition",
      "name": {
        "kind": "Name",
        "value": name.value
      },
      "arguments": buildModelFieldArguments(modelName, obj, models),
      "type": type,
      "directives": obj.directives
    });
  }
  return fields;
};
var buildModelFieldArguments = function buildModelFieldArguments(modelName, definition, models) {
  if (hasRelationDirective(definition)) {
    // TODO clean this up
    var relatedModel = models[definition.type.type.name.value];
    if (relatedModel) {
      var args = [];
      var arr = relatedModel.def.fields;
      var len = arr.length;
      var i = 0;
      var obj = {};
      var name = {};
      var type = {};
      for (; i < len; ++i) {
        obj = arr[i];
        name = obj.name;
        type = obj.type;
        if (!hasRelationDirective(obj)) {
          args.push({
            "kind": "InputValueDefinition",
            "name": {
              "kind": "Name",
              "value": name.value
            },
            "type": type,
            "directives": []
          });
          args.push({
            "kind": "InputValueDefinition",
            "name": {
              "kind": "Name",
              "value": name.value + "s"
            },
            "type": {
              "kind": "ListType",
              "type": type
            },
            "directives": []
          });
        }
      }
      var neo4jArgs = [{
        "kind": "InputValueDefinition",
        "name": {
          "kind": "Name",
          "value": "orderBy"
        },
        "type": {
          "kind": "ListType",
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "_" + modelName + "Ordering"
            }
          }
        },
        "directives": []
      }, {
        "kind": "InputValueDefinition",
        "name": {
          "kind": "Name",
          "value": "_id"
        },
        "type": {
          "kind": "NamedType",
          "name": {
            "kind": "Name",
            "value": "Long"
          }
        },
        "directives": []
      }, {
        "kind": "InputValueDefinition",
        "name": {
          "kind": "Name",
          "value": "_ids"
        },
        "type": {
          "kind": "ListType",
          "type": {
            "kind": "NamedType",
            "name": {
              "kind": "Name",
              "value": "Long"
            }
          }
        },
        "directives": []
      }, {
        "kind": "InputValueDefinition",
        "name": {
          "kind": "Name",
          "value": "first"
        },
        "type": {
          "kind": "NamedType",
          "name": {
            "kind": "Name",
            "value": "Int"
          }
        },
        "directives": []
      }, {
        "kind": "InputValueDefinition",
        "name": {
          "kind": "Name",
          "value": "offset"
        },
        "type": {
          "kind": "NamedType",
          "name": {
            "kind": "Name",
            "value": "Int"
          }
        },
        "directives": []
      }];
      args.push.apply(args, neo4jArgs);
      return args;
    }
  }
  return [];
};
var buildModelType = function buildModelType(key, obj, models) {
  return {
    "kind": "ObjectTypeDefinition",
    "name": {
      "kind": "Name",
      "value": key
    },
    "interfaces": [],
    "directives": [],
    "fields": buildModelFields(key, obj, models)
  };
};
var buildQueryTypeArguments = function buildQueryTypeArguments(modelName, definition) {
  var args = [];
  var arr = definition.fields;
  var len = arr.length;
  var i = 0;
  var obj = {};
  var name = {};
  var type = {};
  for (; i < len; ++i) {
    obj = arr[i];
    name = obj.name;
    type = obj.type;
    if (!hasRelationDirective(obj)) {
      args.push({
        "kind": "InputValueDefinition",
        "name": {
          "kind": "Name",
          "value": name.value
        },
        "type": type,
        "directives": []
      });
      args.push({
        "kind": "InputValueDefinition",
        "name": {
          "kind": "Name",
          "value": name.value + "s"
        },
        "type": {
          "kind": "ListType",
          "type": type
        },
        "directives": []
      });
    }
  }
  var neo4jArgs = [{
    "kind": "InputValueDefinition",
    "name": {
      "kind": "Name",
      "value": "orderBy"
    },
    "type": {
      "kind": "ListType",
      "type": {
        "kind": "NamedType",
        "name": {
          "kind": "Name",
          "value": "_" + modelName + "Ordering"
        }
      }
    },
    "directives": []
  }, {
    "kind": "InputValueDefinition",
    "name": {
      "kind": "Name",
      "value": "_id"
    },
    "type": {
      "kind": "NamedType",
      "name": {
        "kind": "Name",
        "value": "Long"
      }
    },
    "directives": []
  }, {
    "kind": "InputValueDefinition",
    "name": {
      "kind": "Name",
      "value": "_ids"
    },
    "type": {
      "kind": "ListType",
      "type": {
        "kind": "NamedType",
        "name": {
          "kind": "Name",
          "value": "Long"
        }
      }
    },
    "directives": []
  }, {
    "kind": "InputValueDefinition",
    "name": {
      "kind": "Name",
      "value": "first"
    },
    "type": {
      "kind": "NamedType",
      "name": {
        "kind": "Name",
        "value": "Int"
      }
    },
    "directives": []
  }, {
    "kind": "InputValueDefinition",
    "name": {
      "kind": "Name",
      "value": "offset"
    },
    "type": {
      "kind": "NamedType",
      "name": {
        "kind": "Name",
        "value": "Int"
      }
    },
    "directives": []
  }];
  args.push.apply(args, neo4jArgs);
  return args;
};
var buildQueryType = function buildQueryType(key, obj) {
  return {
    "kind": "FieldDefinition",
    "name": {
      "kind": "Name",
      "value": key
    },
    "arguments": buildQueryTypeArguments(key, obj),
    "type": {
      "kind": "ListType",
      "type": {
        "kind": "NamedType",
        "name": {
          "kind": "Name",
          "value": key
        }
      }
    },
    "directives": []
  };
};
var buildMutationTypeArguments = function buildMutationTypeArguments(modelName, definition) {
  var args = [];
  var arr = definition.fields;
  var len = arr.length;
  var i = 0;
  var obj = {};
  var name = {};
  var type = {};
  for (; i < len; ++i) {
    obj = arr[i];
    name = obj.name;
    type = obj.type;
    if (!hasRelationDirective(obj)) {
      args.push({
        "kind": "InputValueDefinition",
        "name": {
          "kind": "Name",
          "value": name.value
        },
        "type": type,
        "directives": []
      });
    }
  }
  return args;
};
var buildMutationType = function buildMutationType(key, obj) {
  return {
    "kind": "FieldDefinition",
    "name": {
      "kind": "Name",
      "value": "create" + key
    },
    "arguments": buildMutationTypeArguments(key, obj),
    "type": {
      "kind": "NamedType",
      "name": {
        "kind": "Name",
        "value": "String"
      }
    },
    "directives": []
  };
};
var buildEnumValues = function buildEnumValues(definition) {
  var values = [];
  var arr = definition.fields;
  var len = arr.length;
  var i = 0;
  var obj = {};
  var name = {};
  var type = {};
  for (; i < len; ++i) {
    obj = arr[i];
    name = obj.name;
    if (!hasRelationDirective(obj)) {
      values.push({
        "kind": "EnumValueDefinition",
        "name": {
          "kind": "Name",
          "value": name.value + "_asc"
        },
        "directives": []
      });
      values.push({
        "kind": "EnumValueDefinition",
        "name": {
          "kind": "Name",
          "value": name.value + "_desc"
        },
        "directives": []
      });
    }
  }
  return values;
};
var buildOrderingType = function buildOrderingType(key, obj) {
  return {
    "kind": "EnumTypeDefinition",
    "name": {
      "kind": "Name",
      "value": "_" + key + "Ordering"
    },
    "directives": [],
    "values": buildEnumValues(obj)
  };
};
var buildFieldMap = function buildFieldMap(arr) {
  var len = arr.length;
  var i = 0;
  var obj = {};
  var fieldMap = {};
  for (; i < len; ++i) {
    obj = arr[i];
    fieldMap[obj.name.value] = obj;
  }
  return fieldMap;
};
var buildObjectTypeDefinition = function buildObjectTypeDefinition(_ref4) {
  var name = _ref4.name;

  return {
    "kind": "ObjectTypeDefinition",
    "name": {
      "kind": "Name",
      "value": name
    },
    "interfaces": [],
    "directives": [],
    "fields": []
  };
};
var buildOperationTypeDefinition = function buildOperationTypeDefinition(_ref5) {
  var operation = _ref5.operation,
      name = _ref5.name;

  return {
    "kind": "OperationTypeDefinition",
    "operation": operation,
    "type": {
      "kind": "NamedType",
      "name": {
        "kind": "Name",
        "value": name
      }
    }
  };
};
var isSchemaDefinition = function isSchemaDefinition(def) {
  return def && def.kind === "SchemaDefinition";
};
var hasRelationDirective = function hasRelationDirective(definition) {
  var directives = definition.directives;
  var hasRelation = false;
  directives.forEach(function (directive) {
    if (directive.name.value === "relation") {
      hasRelation = true;
    }
  });
  return hasRelation;
};